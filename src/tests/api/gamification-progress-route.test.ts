/**
 * Route-level tests for GET /api/gamification/progress.
 *
 * Exercises the real handler: 401 guard, defaults for a fresh user,
 * XP/level computation (including the level-progress percentage),
 * streak values, and badge/achievement serialization.
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

import { GET } from "@/app/api/gamification/progress/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

function getProgress(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return GET();
}

describe("Gamification progress route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await getProgress()).status).toBe(401);
  });

  it("returns defaults for a fresh user", async () => {
    const user = await createTestUser(prisma, { email: "g-fresh@test.com" });
    const res = await getProgress(createMockSession({ id: user.id }));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.xp.current).toBe(0);
    expect(data.xp.level).toBe(1);
    expect(data.xp.nextLevelAt).toBe(200);
    expect(data.xp.levelProgress).toBe(0);
    expect(data.streak.current).toBe(0);
    expect(data.streak.longest).toBe(0);
    expect(data.streak.lastActivity).toBeNull();
    expect(data.badges).toEqual([]);
    expect(data.recentAchievements).toEqual([]);
  });

  it("computes level progress within the current level", async () => {
    const user = await createTestUser(prisma, { email: "g-level@test.com" });
    // Level 2 → 250 XP means 50 XP into the 200→400 band → 25%
    await prisma.userXP.create({ data: { userId: user.id, xp: 250, level: 2 } });

    const res = await getProgress(createMockSession({ id: user.id }));
    const data = await res.json();
    expect(data.xp.current).toBe(250);
    expect(data.xp.level).toBe(2);
    expect(data.xp.nextLevelAt).toBe(400);
    expect(data.xp.levelProgress).toBe(25);
  });

  it("caps level progress at 100%", async () => {
    const user = await createTestUser(prisma, { email: "g-cap@test.com" });
    // Level 1 with 399 XP is past the 0→200 band; should clamp to 100
    await prisma.userXP.create({ data: { userId: user.id, xp: 399, level: 1 } });

    const res = await getProgress(createMockSession({ id: user.id }));
    const data = await res.json();
    expect(data.xp.levelProgress).toBe(100);
  });

  it("returns streak and badges with proper serialization", async () => {
    const user = await createTestUser(prisma, { email: "g-badges@test.com" });
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.userStreak.create({
      data: { userId: user.id, currentStreak: 3, longestStreak: 5, lastActivityAt: yesterday },
    });
    await prisma.userBadge.create({
      data: {
        userId: user.id,
        badge: "FIRST_LESSON",
        title: "Primeira Aula",
        description: "Completou a primeira aula",
      },
    });
    await prisma.achievement.create({
      data: { userId: user.id, type: "BADGE", title: "Badge! 🎯", xpGained: 25 },
    });

    const res = await getProgress(createMockSession({ id: user.id }));
    const data = await res.json();

    expect(data.streak.current).toBe(3);
    expect(data.streak.longest).toBe(5);
    expect(data.streak.lastActivity).toBe(yesterday.toISOString());
    expect(data.badges).toHaveLength(1);
    expect(data.badges[0].badge).toBe("FIRST_LESSON");
    expect(typeof data.badges[0].earnedAt).toBe("string");
    expect(data.recentAchievements).toHaveLength(1);
    expect(data.recentAchievements[0].xpGained).toBe(25);
  });
});
