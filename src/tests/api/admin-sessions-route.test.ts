/**
 * Route tests for the admin session-management endpoints:
 *  - GET  /api/admin/students/[id]/sessions  (list a student's sessions)
 *  - POST /api/admin/sessions/[id]/revoke    (end a student's session)
 *
 * Both are ADMIN-only; unlike the profile revoke endpoint there is no
 * "current session" guard — an admin may end any session.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));
vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { GET as listSessions } from "@/app/api/admin/students/[id]/sessions/route";
import { POST as revokeSession } from "@/app/api/admin/sessions/[id]/revoke/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

function studentSessionReq(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/students/${id}/sessions`);
}

function revokeReq(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/admin/sessions/${id}/revoke`, {
    method: "POST",
  });
}

describe("Admin session management routes", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 for non-admin users (list and revoke)", async () => {
    const student = await createTestUser(prisma, { email: "adm-sess-student@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));

    expect((await listSessions(studentSessionReq(student.id), { params: Promise.resolve({ id: student.id }) })).status).toBe(401);
    expect((await revokeSession(revokeReq("whatever"), { params: Promise.resolve({ id: "whatever" }) })).status).toBe(401);
  });

  it("returns 404 when the student does not exist", async () => {
    authMock.auth.mockResolvedValue(createMockSession({ id: "admin-1", role: "ADMIN" }));
    const res = await listSessions(studentSessionReq("missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("lists a student's sessions for an admin", async () => {
    const admin = await createTestUser(prisma, { email: "adm-sess-admin@test.com", role: "ADMIN" });
    const student = await createTestUser(prisma, { email: "adm-sess-listed@test.com" });

    const rec1 = await prisma.loginHistory.create({
      data: { userId: student.id, ipHash: "hash-1", userAgent: "Chrome", sessionTokenHash: "tok-1" },
    });
    const rec2 = await prisma.loginHistory.create({
      data: { userId: student.id, ipHash: "hash-2", userAgent: "Firefox", sessionTokenHash: "tok-2", revokedAt: new Date() },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    const res = await listSessions(studentSessionReq(student.id), {
      params: Promise.resolve({ id: student.id }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.student.email).toBe(student.email);
    expect(data.sessions).toHaveLength(2);

    const sessions = data.sessions as {
      id: string;
      userAgent: string | null;
      createdAt: string;
      revoked: boolean;
      revocable: boolean;
    }[];
    const byId = new Map(sessions.map((s) => [s.id, s]));
    expect(byId.get(rec1.id)?.revocable).toBe(true);
    expect(byId.get(rec2.id)?.revoked).toBe(true);
    expect(byId.get(rec2.id)?.revocable).toBe(false);
  });

  it("revokes a student's session for an admin", async () => {
    const admin = await createTestUser(prisma, { email: "adm-sess-revoker@test.com", role: "ADMIN" });
    const student = await createTestUser(prisma, { email: "adm-sess-victim@test.com" });
    const rec = await prisma.loginHistory.create({
      data: { userId: student.id, ipHash: "hash-x", userAgent: "Edge", sessionTokenHash: "tok-x" },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    const res = await revokeSession(revokeReq(rec.id), { params: Promise.resolve({ id: rec.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    const updated = await prisma.loginHistory.findUnique({ where: { id: rec.id } });
    expect(updated?.revokedAt).toBeTruthy();
  });

  it("is idempotent for an already-revoked session", async () => {
    const admin = await createTestUser(prisma, { email: "adm-sess-done@test.com", role: "ADMIN" });
    const student = await createTestUser(prisma, { email: "adm-sess-done-student@test.com" });
    const rec = await prisma.loginHistory.create({
      data: { userId: student.id, ipHash: "hash-y", sessionTokenHash: "tok-y", revokedAt: new Date() },
    });

    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    const res = await revokeSession(revokeReq(rec.id), { params: Promise.resolve({ id: rec.id }) });
    expect(res.status).toBe(200);
    expect((await res.json()).alreadyRevoked).toBe(true);
  });

  it("returns 404 for an unknown session", async () => {
    const admin = await createTestUser(prisma, { email: "adm-sess-unknown@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    const res = await revokeSession(revokeReq("nope"), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
