/**
 * Route-level tests for POST /api/profile/sessions/[id]/revoke.
 *
 * Exercises the ownership guard (a user can only revoke their OWN sessions),
 * the "current session" protection, and the actual blacklist + DB update.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { POST } from "@/app/api/profile/sessions/[id]/revoke/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

async function postRevoke(
  id: string,
  cookieToken?: string
): Promise<Response> {
  const request = new NextRequest("http://localhost/api/profile/sessions/x/revoke", {
    method: "POST",
    ...(cookieToken ? { headers: { cookie: `authjs.session-token=${cookieToken}` } } : {}),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("Profile sessions revoke route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await postRevoke("whatever")).status).toBe(401);
  });

  it("cannot revoke another user's session (404)", async () => {
    const owner = await createTestUser(prisma, { email: "rv-owner@test.com" });
    const other = await createTestUser(prisma, { email: "rv-other@test.com" });

    const record = await prisma.loginHistory.create({
      data: { userId: owner.id, ipHash: "hash-a", userAgent: "Test" },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: other.id }));
    const res = await postRevoke(record.id);
    expect(res.status).toBe(404);
  });

  it("revokes a session by marking it revoked in the DB", async () => {
    const user = await createTestUser(prisma, { email: "rv-user@test.com" });
    const record = await prisma.loginHistory.create({
      data: { userId: user.id, ipHash: "hash-a", sessionTokenHash: "abc123hash", userAgent: "Test" },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: user.id }));
    const res = await postRevoke(record.id);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    // The record is marked revoked — the proxy rejects that hash from now on.
    const updated = await prisma.loginHistory.findUnique({ where: { id: record.id } });
    expect(updated?.revokedAt).toBeTruthy();
  });

  it("refuses to revoke the user's own current session", async () => {
    const user = await createTestUser(prisma, { email: "rv-current@test.com" });
    // The request carries "current-token" — its hash IS the current session.
    const { hashSessionToken } = await import("@/lib/session-token");
    const currentHash = await hashSessionToken("current-token");
    const record = await prisma.loginHistory.create({
      data: { userId: user.id, ipHash: "hash-b", sessionTokenHash: currentHash, userAgent: "Test" },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: user.id }));
    const blocked = await postRevoke(record.id, "current-token");
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toContain("sessão atual");
    const untouched = await prisma.loginHistory.findUnique({ where: { id: record.id } });
    expect(untouched?.revokedAt).toBeNull();
  });

  it("is idempotent for an already-revoked session", async () => {
    const user = await createTestUser(prisma, { email: "rv-done@test.com" });
    const record = await prisma.loginHistory.create({
      data: { userId: user.id, ipHash: "hash-c", sessionTokenHash: "done-hash", revokedAt: new Date(), userAgent: "Test" },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: user.id }));
    const res = await postRevoke(record.id);
    expect(res.status).toBe(200);
    expect((await res.json()).alreadyRevoked).toBe(true);
  });
});
