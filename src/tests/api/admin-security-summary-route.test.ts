/**
 * Route tests for POST /api/admin/security-summary — the admin daily
 * security digest. Verifies the ADMIN guard, the event aggregation (logins
 * + revoked sessions today), the consolidated email and the once-per-day
 * idempotency.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));
vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

const emailMock = vi.hoisted(() => ({ sendSecurityDailySummaryEmail: vi.fn() }));
vi.mock("@/lib/email", () => emailMock);

import { POST, GET } from "@/app/api/admin/security-summary/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

describe("POST /api/admin/security-summary", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 for non-admin users", async () => {
    const student = await createTestUser(prisma, { email: "sec-sum-student@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    expect((await POST()).status).toBe(401);
  });

  it("does nothing on a quiet day (no events, no email)", async () => {
    const admin = await createTestUser(prisma, { email: "sec-sum-admin@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));

    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(false);
    expect(data.events.logins).toBe(0);
    expect(data.events.revokedSessions).toHaveLength(0);
    expect(emailMock.sendSecurityDailySummaryEmail).not.toHaveBeenCalled();
  });

  it("aggregates the day's events, notifies and emails the admin", async () => {
    const admin = await createTestUser(prisma, {
      email: "sec-sum-busy-admin@test.com",
      role: "ADMIN",
    });
    const student = await createTestUser(prisma, { email: "sec-sum-busy-student@test.com" });

    // Two logins today from the same student + one session revoked today.
    await prisma.loginHistory.create({
      data: { userId: student.id, ipHash: "h1", userAgent: "Chrome" },
    });
    await prisma.loginHistory.create({
      data: { userId: student.id, ipHash: "h2", userAgent: "Firefox" },
    });
    const revoked = await prisma.loginHistory.create({
      data: { userId: student.id, ipHash: "h3", userAgent: "Edge", revokedAt: new Date() },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(true);
    expect(data.events.logins).toBe(3);
    expect(data.events.distinctUsers).toBe(1);
    expect(data.events.revokedSessions).toHaveLength(1);
    expect(data.events.revokedSessions[0].userEmail).toBe(student.email);

    // In-app notification created (idempotency marker) and email attempted.
    const notif = await prisma.notification.findFirst({
      where: { userId: admin.id },
      orderBy: { createdAt: "desc" },
    });
    expect(notif?.title).toContain("Resumo Diário de Segurança");
    expect(emailMock.sendSecurityDailySummaryEmail).toHaveBeenCalledWith(
      admin.email,
      expect.objectContaining({ logins: 3, revokedSessions: expect.any(Array) })
    );

    // The revoked record exists (referenced by the summary).
    expect(revoked.id).toBeTruthy();
  });

  it("GET returns today's events without sending anything", async () => {
    const admin = await createTestUser(prisma, { email: "sec-sum-get@test.com", role: "ADMIN" });
    const student = await createTestUser(prisma, { email: "sec-sum-get-student@test.com" });
    await prisma.loginHistory.create({
      data: { userId: student.id, ipHash: "h-get", userAgent: "Safari" },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    emailMock.sendSecurityDailySummaryEmail.mockClear();
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    // The DB is shared with the tests above, so assert presence, not exact
    // counts — the point is the GET has NO side effects.
    expect(data.events.logins).toBeGreaterThanOrEqual(1);
    // No email and no notification side effects.
    expect(emailMock.sendSecurityDailySummaryEmail).not.toHaveBeenCalled();
    const notif = await prisma.notification.count({ where: { userId: admin.id } });
    expect(notif).toBe(0);
  });

  it("is idempotent — a second call the same day does not resend", async () => {
    const admin = await createTestUser(prisma, { email: "sec-sum-again@test.com", role: "ADMIN" });
    const student = await createTestUser(prisma, { email: "sec-sum-again-student@test.com" });
    await prisma.loginHistory.create({
      data: { userId: student.id, ipHash: "h4", userAgent: "Safari" },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));

    emailMock.sendSecurityDailySummaryEmail.mockClear();
    const first = await POST();
    expect((await first.json()).sent).toBe(true);

    const second = await POST();
    expect(second.status).toBe(200);
    const data = await second.json();
    expect(data.alreadySent).toBe(true);
    expect(data.sent).toBe(false);
    // Exactly ONE email for the whole day — the second POST did not resend.
    expect(emailMock.sendSecurityDailySummaryEmail).toHaveBeenCalledTimes(1);
  });
});
