/**
 * Route-level tests for GET /api/progress/weekly-xp.
 *
 * Covers the auth guard, the 7-day XP/lesson buckets, the personal 30-day
 * average and the platform comparison (rank, average, top percent). The
 * comparison aggregate is cached for 60s under a per-day key, so each
 * scenario invalidates it to stay deterministic.
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

import { GET } from "@/app/api/progress/weekly-xp/route";
import { cache } from "@/lib/cache";
import { XP_PER_LESSON } from "@/lib/xp";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createTestCourse,
  createTestModule,
  createTestLesson,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

async function freshComparison() {
  await cache.invalidate("progress:weekly-xp:*");
}

async function completeLessonToday(userId: string) {
  const course = await createTestCourse(prisma);
  const mod = await createTestModule(prisma, course.id);
  const lesson = await createTestLesson(prisma, mod.id);
  await prisma.lessonProgress.create({
    data: {
      userId,
      lessonId: lesson.id,
      completed: true,
      completedAt: new Date(),
    },
  });
  return lesson;
}

function getWeeklyXp(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return GET();
}

describe("GET /api/progress/weekly-xp", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await getWeeklyXp()).status).toBe(401);
  });

  it("returns 7 zeroed days for a fresh user", async () => {
    await freshComparison();
    const user = await createTestUser(prisma, { email: "wxp-empty@test.com" });
    const res = await getWeeklyXp(createMockSession({ id: user.id }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.days).toHaveLength(7);
    expect(data.totalXp).toBe(0);
    expect(data.totalLessons).toBe(0);
    expect(data.monthAverage).toBe(0);
    expect(data.weekDailyAverage).toBe(0);
    // A user with no XP is not part of the weekly ranking at all — assert
    // against the DB (users accumulate across scenarios in this file) so
    // the test stays order-independent.
    const xpUsers = await prisma.userXP.count();
    if (xpUsers === 0) {
      expect(data.weeklyRank).toBeNull();
      expect(data.platformAverage).toBe(0);
    } else {
      expect(data.weeklyRank).toBeNull();
    }
  });

  it("buckets today's completed lesson into today's XP", async () => {
    await freshComparison();
    const user = await createTestUser(prisma, { email: "wxp-today@test.com" });
    await completeLessonToday(user.id);

    const res = await getWeeklyXp(createMockSession({ id: user.id }));
    const data = await res.json();

    expect(data.totalXp).toBe(XP_PER_LESSON);
    expect(data.totalLessons).toBe(1);
    const todayBucket = data.days[data.days.length - 1];
    expect(todayBucket.xp).toBe(XP_PER_LESSON);
    expect(todayBucket.lessons).toBe(1);
  });

  it("adds achievement XP bonuses into the daily buckets", async () => {
    await freshComparison();
    const user = await createTestUser(prisma, { email: "wxp-ach@test.com" });
    await completeLessonToday(user.id);
    await prisma.achievement.create({
      data: {
        userId: user.id,
        type: "BADGE",
        title: "Badge de teste",
        xpGained: 25,
        createdAt: new Date(),
      },
    });

    const res = await getWeeklyXp(createMockSession({ id: user.id }));
    const data = await res.json();

    // 1 lesson (XP_PER_LESSON) + 25 bonus, all on today's bucket.
    expect(data.totalXp).toBe(XP_PER_LESSON + 25);
    const todayBucket = data.days[data.days.length - 1];
    expect(todayBucket.xp).toBe(XP_PER_LESSON + 25);
  });

  it("computes the weekly rank and platform average across users", async () => {
    await freshComparison();
    const weak = await createTestUser(prisma, { email: "wxp-weak@test.com" });
    const strong = await createTestUser(prisma, { email: "wxp-strong@test.com" });
    await completeLessonToday(weak.id); // 1 lesson
    await completeLessonToday(strong.id);
    await completeLessonToday(strong.id); // 2 lessons

    // The DB accumulates users across tests in this file, so assert the
    // relative ordering instead of hardcoded ranks: strong (2 lessons) must
    // always outrank weak (1 lesson).
    const weakRes = await getWeeklyXp(createMockSession({ id: weak.id }));
    const strongRes = await getWeeklyXp(createMockSession({ id: strong.id }));
    const weakData = await weakRes.json();
    const strongData = await strongRes.json();

    expect(weakData.platformAverage).toBeGreaterThan(0);
    expect(strongData.weeklyRank).toBeLessThan(weakData.weeklyRank);
    expect(weakData.totalParticipants).toBeGreaterThanOrEqual(2);
    expect(weakData.topPercent).toBeGreaterThan(0);
  });

  it("reports the personal 30-day average pace", async () => {
    await freshComparison();
    const user = await createTestUser(prisma, { email: "wxp-month@test.com" });
    // 3 lessons today → weekly average = 3*XP/7, monthly average = 3*XP/30.
    await completeLessonToday(user.id);
    await completeLessonToday(user.id);
    await completeLessonToday(user.id);

    const res = await getWeeklyXp(createMockSession({ id: user.id }));
    const data = await res.json();

    expect(data.weekDailyAverage).toBe(Math.round((3 * XP_PER_LESSON) / 7));
    expect(data.monthAverage).toBe(Math.round((3 * XP_PER_LESSON) / 30));
  });
});
