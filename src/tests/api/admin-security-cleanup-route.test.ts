/**
 * Route tests for POST /api/admin/security-cleanup — the session-history
 * housekeeping job. Only admins may run it; it removes records older than
 * 90 days and revoked sessions older than 30 days.
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

import { POST } from "@/app/api/admin/security-cleanup/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

const DAY = 24 * 60 * 60 * 1000;

describe("POST /api/admin/security-cleanup", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 for non-admin users", async () => {
    const student = await createTestUser(prisma, { email: "cleanup-student@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    expect((await POST()).status).toBe(401);
  });

  it("deletes old logins (>90d) and old revoked sessions (>30d), keeps the rest", async () => {
    const admin = await createTestUser(prisma, { email: "cleanup-admin@test.com", role: "ADMIN" });
    const user = await createTestUser(prisma, { email: "cleanup-user@test.com" });

    // Old login (100 days) → deleted.
    await prisma.loginHistory.create({
      data: { userId: user.id, ipHash: "h-old", userAgent: "A", createdAt: new Date(Date.now() - 100 * DAY) },
    });
    // Old revoked (45 days ago) → deleted.
    await prisma.loginHistory.create({
      data: { userId: user.id, ipHash: "h-rev", userAgent: "B", revokedAt: new Date(Date.now() - 45 * DAY), createdAt: new Date(Date.now() - 46 * DAY) },
    });
    // Recent revoked (5 days ago) → kept (still a useful short-term trace).
    await prisma.loginHistory.create({
      data: { userId: user.id, ipHash: "h-rev2", userAgent: "C", revokedAt: new Date(Date.now() - 5 * DAY), createdAt: new Date(Date.now() - 6 * DAY) },
    });
    // Recent login (today) → kept.
    await prisma.loginHistory.create({
      data: { userId: user.id, ipHash: "h-new", userAgent: "D" },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    const res = await POST();
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(2);

    const remaining = await prisma.loginHistory.findMany({ where: { userId: user.id } });
    expect(remaining).toHaveLength(2);
  });

  it("is safe to run repeatedly (idempotent)", async () => {
    const admin = await createTestUser(prisma, { email: "cleanup-again@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    const first = await POST();
    const second = await POST();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await second.json()).deleted).toBe(0);
  });
});
