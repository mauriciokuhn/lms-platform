/**
 * Route-level tests for GET /api/progress/daily.
 *
 * Covers the auth guard, the zero-day baseline, and counting lessons
 * completed today (the dashboard "Meta Diária" data source).
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

import { GET } from "@/app/api/progress/daily/route";
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

function getDaily(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return GET();
}

describe("GET /api/progress/daily", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await getDaily()).status).toBe(401);
  });

  it("reports zero completed lessons today for a fresh user", async () => {
    const user = await createTestUser(prisma, { email: "daily-empty@test.com" });
    const res = await getDaily(createMockSession({ id: user.id }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.completedToday).toBe(0);
    expect(data.goal).toBe(3);
  });

  it("counts only lessons completed since midnight", async () => {
    const user = await createTestUser(prisma, { email: "daily-count@test.com" });
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    const todayLesson = await createTestLesson(prisma, mod.id);
    const yesterdayLesson = await createTestLesson(prisma, mod.id, {
      title: "Yesterday Lesson",
      orderIndex: 2,
    });

    // Completed today (now).
    await prisma.lessonProgress.create({
      data: {
        userId: user.id,
        lessonId: todayLesson.id,
        completed: true,
        completedAt: new Date(),
      },
    });
    // Completed yesterday — must NOT count.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await prisma.lessonProgress.create({
      data: {
        userId: user.id,
        lessonId: yesterdayLesson.id,
        completed: true,
        completedAt: yesterday,
      },
    });

    const res = await getDaily(createMockSession({ id: user.id }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.completedToday).toBe(1);
  });

  it("ignores incomplete (saved but not finished) lessons", async () => {
    const user = await createTestUser(prisma, { email: "daily-saved@test.com" });
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    const lesson = await createTestLesson(prisma, mod.id);

    await prisma.lessonProgress.create({
      data: {
        userId: user.id,
        lessonId: lesson.id,
        completed: false,
        watchedSeconds: 42,
        lastAccessedAt: new Date(),
      },
    });

    const res = await getDaily(createMockSession({ id: user.id }));
    const data = await res.json();
    expect(data.completedToday).toBe(0);
  });
});
