/**
 * Route-level tests for GET /api/admin/challenge-stats.
 *
 * Exercises the ADMIN-only guard and the shape of the challenge metrics
 * (issued/solved/failed counters, aggregate + per account).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { GET } from "@/app/api/admin/challenge-stats/route";
import {
  issueLoginChallenge,
  verifyLoginChallenge,
  clearLoginChallenges,
  clearChallengeStats,
} from "@/lib/login-challenge";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();

function getStats(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return GET();
}

describe("Admin challenge-stats route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated or not an admin", async () => {
    expect((await getStats()).status).toBe(401);

    const student = await createTestUser(prisma, { email: "cs-student@test.com" });
    const studentRes = await getStats(createMockSession({ id: student.id, role: "STUDENT" }));
    expect(studentRes.status).toBe(401);
  });

  it("exposes zeroed stats for a fresh process", async () => {
    clearChallengeStats();
    clearLoginChallenges();
    const admin = await createTestUser(prisma, { email: "cs-admin@test.com", role: "ADMIN" });
    const res = await getStats(createMockSession({ id: admin.id, role: "ADMIN" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats.total).toEqual({ issued: 0, solved: 0, failed: 0, solveRate: null });
    expect(data.stats.byAccount).toEqual([]);
  });

  it("tracks issued/solved/failed per account", async () => {
    clearChallengeStats();
    clearLoginChallenges();
    const admin = await createTestUser(prisma, { email: "cs-admin2@test.com", role: "ADMIN" });

    // One solved + one failed attempt on the same account.
    const { token, question } = await issueLoginChallenge("alvo@exemplo.com");
    const [a, b] = question.match(/\d+/g)!.map(Number);
    await verifyLoginChallenge(token, String(a + b), "alvo@exemplo.com");
    const { token: t2 } = await issueLoginChallenge("alvo@exemplo.com");
    await verifyLoginChallenge(t2, "999", "alvo@exemplo.com");
    // One issued but never answered (no verify call).
    await issueLoginChallenge("alvo@exemplo.com");

    const res = await getStats(createMockSession({ id: admin.id, role: "ADMIN" }));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.stats.total.issued).toBe(3);
    expect(data.stats.total.solved).toBe(1);
    expect(data.stats.total.failed).toBe(1);
    expect(data.stats.total.solveRate).toBe(50);
    expect(data.stats.byAccount).toHaveLength(1);
    expect(data.stats.byAccount[0].email).toBe("alvo@exemplo.com");
    expect(data.stats.byAccount[0]).toMatchObject({ issued: 3, solved: 1, failed: 1 });
  });
});
