/**
 * Route-level tests for GET /api/gamification/ranking.
 *
 * Covers the auth guard, the top-20 ordering, the current user's rank, and
 * the total student count. The route caches the top-20 for 30s, so the test
 * invalidates the cache before each scenario to stay deterministic.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { GET } from "@/app/api/gamification/ranking/route";
import { cache } from "@/lib/cache";
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser, createMockSession } from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

async function freshRanking() {
  await cache.invalidate("gamification:ranking:*");
}

describe("Gamification ranking route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    authMock.auth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the top-20 ordered by XP desc with ranks", async () => {
    await freshRanking();

    const top = await createTestUser(prisma, { email: "rank-top@test.com" });
    const mid = await createTestUser(prisma, { email: "rank-mid@test.com" });

    await prisma.userXP.create({ data: { userId: top.id, xp: 500, level: 3 } });
    await prisma.userXP.create({ data: { userId: mid.id, xp: 100, level: 1 } });

    authMock.auth.mockResolvedValue(createMockSession({ id: mid.id, email: "rank-mid@test.com" }));

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ranking).toHaveLength(2);
    expect(data.ranking[0].userId).toBe(top.id);
    expect(data.ranking[0].xp).toBe(500);
    expect(data.ranking[0].rank).toBe(1);
    expect(data.ranking[1].rank).toBe(2);

    // mid is #2 in the top-20, so userRank matches the list position.
    expect(data.userRank).toBe(2);
    expect(data.totalStudents).toBe(2);
  });

  it("computes the rank for a user outside the top-20", async () => {
    await freshRanking();

    // Fill the top-20 with stronger students so the weak user falls out of
    // the returned list and the route must compute the position via count.
    const fillerEmails = Array.from({ length: 20 }, (_, i) => `rank-fill-${i}@test.com`);
    await prisma.user.createMany({
      data: fillerEmails.map((email, i) => ({
        name: `Filler ${i}`,
        email,
        passwordHash: "not-a-real-hash",
        role: "STUDENT",
      })),
    });
    const fillers = await prisma.user.findMany({
      where: { email: { in: fillerEmails } },
      select: { id: true },
    });
    await prisma.userXP.createMany({
      data: fillers.map((u, i) => ({ userId: u.id, xp: 1000 + i, level: 5 })),
    });

    const weak = await createTestUser(prisma, { email: "rank-weak@test.com" });
    await prisma.userXP.create({ data: { userId: weak.id, xp: 10, level: 1 } });

    authMock.auth.mockResolvedValue(createMockSession({ id: weak.id, email: "rank-weak@test.com" }));

    const res = await GET();
    const data = await res.json();

    // weak must NOT appear in the top-20 list (all fillers outrank it).
    expect(data.ranking.length).toBe(20);
    expect(data.ranking.some((r: { userId: string }) => r.userId === weak.id)).toBe(false);

    // Rank is computed from the count of students with higher XP (dynamic,
    // so earlier tests' accumulated users can't break the assertion).
    const higherCount = await prisma.userXP.count({
      where: { xp: { gt: 10 }, user: { role: "STUDENT" } },
    });
    expect(data.userRank).toBe(higherCount + 1);
  });

  it("returns null userRank when the current user has no XP record", async () => {
    await freshRanking();

    const user = await createTestUser(prisma, { email: "rank-noxp@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id, email: "rank-noxp@test.com" }));

    const res = await GET();
    const data = await res.json();

    expect(data.userRank).toBeNull();

    // Total students accumulates across tests in this file — assert against
    // the real DB count instead of a hardcoded number.
    const studentCount = await prisma.user.count({ where: { role: "STUDENT" } });
    expect(data.totalStudents).toBe(studentCount);
  });
});
