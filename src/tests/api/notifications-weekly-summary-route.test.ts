/**
 * Route-level tests for POST /api/notifications/weekly-summary.
 *
 * Covers the auth guard, creating the weekly summary notification with the
 * correct stats (lessons, XP, streak), the 7-day idempotency window and the
 * no-celebration short-circuit when the user completed no lessons.
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

import { POST } from "@/app/api/notifications/weekly-summary/route";
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

function postSummary(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return POST();
}

describe("POST /api/notifications/weekly-summary", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await postSummary()).status).toBe(401);
  });

  it("returns created:false when no lessons were completed", async () => {
    const user = await createTestUser(prisma, { email: "ws-empty@test.com" });
    const res = await postSummary(createMockSession({ id: user.id }));
    expect(res.status).toBe(200);
    expect((await res.json()).created).toBe(false);
  });

  it("creates the weekly summary with lessons, XP and streak", async () => {
    const user = await createTestUser(prisma, { email: "ws-create@test.com" });
    await prisma.userStreak.create({
      data: { userId: user.id, currentStreak: 4, longestStreak: 4 },
    });

    // Two lessons completed this week.
    for (let i = 0; i < 2; i++) {
      const course = await createTestCourse(prisma);
      const mod = await createTestModule(prisma, course.id);
      const lesson = await createTestLesson(prisma, mod.id);
      await prisma.lessonProgress.create({
        data: { userId: user.id,      lessonId: lesson.id, completed: true, completedAt: new Date() },
      });
    }
    // One achievement bonus.
    await prisma.achievement.create({
      data: { userId: user.id, type: "BADGE", title: "B", xpGained: 30, createdAt: new Date() },
    });

    const res = await postSummary(createMockSession({ id: user.id }));
    expect(res.status).toBe(200);
    expect((await res.json()).created).toBe(true);

    const notif = await prisma.notification.findFirst({
      where: { userId: user.id, title: { startsWith: "Resumo da Semana" } },
    });
    expect(notif).not.toBeNull();
    // 2 lessons × 50 XP + 30 bonus = 130 XP.
    expect(notif?.message).toContain("2 aulas (+130 XP)");
    expect(notif?.message).toContain("streak de 4 dias");
  });

  it("is idempotent within the same 7-day window", async () => {
    const user = await createTestUser(prisma, { email: "ws-dup@test.com" });
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    const lesson = await createTestLesson(prisma, mod.id);
    await prisma.lessonProgress.create({
      data: { userId: user.id,      lessonId: lesson.id, completed: true, completedAt: new Date() },
    });

    const first = await postSummary(createMockSession({ id: user.id }));
    expect((await first.json()).created).toBe(true);

    const second = await postSummary(createMockSession({ id: user.id }));
    expect((await second.json()).created).toBe(false);

    const count = await prisma.notification.count({
      where: { userId: user.id, title: { startsWith: "Resumo da Semana" } },
    });
    expect(count).toBe(1);
  });
});
