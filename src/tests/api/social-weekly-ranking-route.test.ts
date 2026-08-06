/**
 * Route-level tests for GET /api/social/weekly-ranking.
 *
 * Exercises the real handler: 401 guard, empty week for a fresh user, and
 * XP aggregation from achievements created this week (with userRank and
 * totalParticipants).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

vi.mock("@/lib/cache", () => ({
  cache: {
    getOrSet: vi.fn(async (_key: string, fetcher: () => unknown) => fetcher()),
    invalidate: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
  },
}));

import { GET } from "@/app/api/social/weekly-ranking/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

describe("Weekly ranking route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await GET()).status).toBe(401);
  });

  it("returns an empty ranking for a fresh user", async () => {
    const user = await createTestUser(prisma, { email: "wr-fresh@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id }));

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ranking).toEqual([]);
    expect(data.userRank).toBeNull();
    expect(data.userXpGained).toBe(0);
    expect(data.totalParticipants).toBe(0);
    expect(typeof data.weekStart).toBe("string");
    expect(typeof data.weekEnd).toBe("string");
  });

  it("aggregates weekly XP from achievements and computes the user rank", async () => {
    const strong = await createTestUser(prisma, { email: "wr-strong@test.com", name: "Forte" });
    const weak = await createTestUser(prisma, { email: "wr-weak@test.com", name: "Fraco" });
    const now = new Date();

    // Same-week achievements (this week)
    await prisma.achievement.create({ data: { userId: strong.id, type: "BADGE", title: "A", xpGained: 60, createdAt: new Date(now.getTime() - 3600000) } });
    await prisma.achievement.create({ data: { userId: strong.id, type: "BADGE", title: "B", xpGained: 40, createdAt: new Date(now.getTime() - 1800000) } });
    await prisma.achievement.create({ data: { userId: weak.id, type: "BADGE", title: "C", xpGained: 25, createdAt: new Date(now.getTime() - 7200000) } });

    authMock.auth.mockResolvedValue(createMockSession({ id: weak.id }));
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    // strong aggregated 100 XP, weak 25 XP
    expect(data.ranking).toHaveLength(2);
    expect(data.ranking[0].userId).toBe(strong.id);
    expect(data.ranking[0].xpGained).toBe(100);
    expect(data.ranking[1].userId).toBe(weak.id);
    expect(data.ranking[1].xpGained).toBe(25);
    expect(data.userRank).toBe(2);
    expect(data.userXpGained).toBe(25);
    expect(data.totalParticipants).toBe(3); // three achievement rows
  });
});
