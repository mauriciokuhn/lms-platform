import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser } from "../setup";

const prisma = getTestDb();

beforeAll(async () => {
  await cleanupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

/** Mirrors src/app/api/social/weekly-ranking/route.ts getWeekBounds() */
function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
}

describe("Social / Weekly Ranking", () => {
  it("should aggregate XP earned this week per user", async () => {
    const user1 = await createTestUser(prisma, { email: "rank-1@test.com" });
    const user2 = await createTestUser(prisma, { email: "rank-2@test.com" });

    const { start: weekStart, end: weekEnd } = getWeekBounds();

    await prisma.achievement.createMany({
      data: [
        { userId: user1.id, type: "BADGE", title: "Badge A", xpGained: 100 },
        { userId: user1.id, type: "LEVEL_UP", title: "Level up", xpGained: 50 },
        { userId: user2.id, type: "STREAK", title: "Streak mantido", xpGained: 200 },
      ],
    });

    const achievements = await prisma.achievement.findMany({
      where: {
        createdAt: { gte: weekStart, lt: weekEnd },
        // Only this test's users: achievements accumulate across tests in the
        // same week because cleanupTestDb() runs once per file.
        userId: { in: [user1.id, user2.id] },
      },
      select: { userId: true, xpGained: true },
    });

    const xpMap = new Map<string, number>();
    for (const a of achievements) {
      xpMap.set(a.userId, (xpMap.get(a.userId) || 0) + a.xpGained);
    }

    expect(xpMap.get(user1.id)).toBe(150);
    expect(xpMap.get(user2.id)).toBe(200);

    const sorted = Array.from(xpMap.entries()).sort((a, b) => b[1] - a[1]);
    expect(sorted[0][0]).toBe(user2.id);
    expect(sorted[1][0]).toBe(user1.id);
  });

  it("should include only achievements from the current week", async () => {
    const user = await createTestUser(prisma, { email: "rank-week@test.com" });

    const { start: weekStart, end: weekEnd } = getWeekBounds();

    await prisma.achievement.create({
      data: { userId: user.id, type: "BADGE", title: "Na semana", xpGained: 10 },
    });

    const inWeek = await prisma.achievement.findMany({
      where: { userId: user.id, createdAt: { gte: weekStart, lt: weekEnd } },
    });

    expect(inWeek.length).toBeGreaterThanOrEqual(1);
    for (const a of inWeek) {
      expect(a.createdAt.getTime()).toBeGreaterThanOrEqual(weekStart.getTime());
      expect(a.createdAt.getTime()).toBeLessThan(weekEnd.getTime());
    }
  });

  it("should count total participants this week", async () => {
    const user = await createTestUser(prisma, { email: "rank-participants@test.com" });

    const { start: weekStart, end: weekEnd } = getWeekBounds();

    await prisma.achievement.create({
      data: { userId: user.id, type: "BADGE", title: "Participante", xpGained: 25 },
    });

    const totalParticipants = await prisma.achievement.count({
      where: { createdAt: { gte: weekStart, lt: weekEnd } },
    });

    expect(totalParticipants).toBeGreaterThanOrEqual(1);
  });

  it("should compute user rank position", async () => {
    const user1 = await createTestUser(prisma, { email: "rank-pos-1@test.com" });
    const user2 = await createTestUser(prisma, { email: "rank-pos-2@test.com" });

    const { start: weekStart, end: weekEnd } = getWeekBounds();

    await prisma.achievement.createMany({
      data: [
        { userId: user1.id, type: "BADGE", title: "Líder", xpGained: 500 },
        { userId: user2.id, type: "BADGE", title: "Segundo", xpGained: 100 },
      ],
    });

    const achievements = await prisma.achievement.findMany({
      where: {
        createdAt: { gte: weekStart, lt: weekEnd },
        // Only this test's users: achievements accumulate across tests in the
        // same week because cleanupTestDb() runs once per file.
        userId: { in: [user1.id, user2.id] },
      },
      select: { userId: true, xpGained: true },
    });

    const xpMap = new Map<string, number>();
    for (const a of achievements) {
      xpMap.set(a.userId, (xpMap.get(a.userId) || 0) + a.xpGained);
    }

    const sorted = Array.from(xpMap.entries()).sort((a, b) => b[1] - a[1]);
    const user1Rank = sorted.findIndex(([id]) => id === user1.id) + 1;
    const user2Rank = sorted.findIndex(([id]) => id === user2.id) + 1;

    expect(user1Rank).toBe(1);
    expect(user2Rank).toBe(2);
  });
});
