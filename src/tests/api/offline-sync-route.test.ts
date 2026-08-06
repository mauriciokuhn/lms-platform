/**
 * Route-level tests for POST /api/offline/sync.
 *
 * Exercises the real handlers: 401 guard, ENROLL and COMPLETE_LESSON
 * mutations, unknown mutation type rejection, and the REVIEW upsert.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { POST } from "@/app/api/offline/sync/route";
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

function sync(body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request("http://localhost/api/offline/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("Offline sync route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await sync({ type: "ENROLL", payload: { courseId: "x" } })).status).toBe(401);
  });

  it("applies an ENROLL mutation (upsert)", async () => {
    const user = await createTestUser(prisma, { email: "os-enroll@test.com" });
    const course = await createTestCourse(prisma);
    const session = createMockSession({ id: user.id });

    const res = await sync({ type: "ENROLL", payload: { courseId: course.id } }, session);
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    expect(enrollment?.status).toBe("ACTIVE");

    // Re-syncing the same mutation must not create a duplicate
    await sync({ type: "ENROLL", payload: { courseId: course.id } }, session);
    const count = await prisma.enrollment.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });

  it("applies a COMPLETE_LESSON mutation (upsert)", async () => {
    const user = await createTestUser(prisma, { email: "os-lesson@test.com" });
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    const lesson = await createTestLesson(prisma, mod.id);
    const session = createMockSession({ id: user.id });

    const res = await sync(
      { type: "COMPLETE_LESSON", payload: { lessonId: lesson.id, watchedSeconds: 120 } },
      session
    );
    expect(res.status).toBe(200);

    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
    });
    expect(progress?.completed).toBe(true);
    expect(progress?.watchedSeconds).toBe(120);
  });

  it("rejects an unknown mutation type", async () => {
    const user = await createTestUser(prisma, { email: "os-unknown@test.com" });
    const res = await sync({ type: "TIME_TRAVEL", payload: {} }, createMockSession({ id: user.id }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("desconhecido");
  });

  it("applies a REVIEW mutation with upsert semantics", async () => {
    const user = await createTestUser(prisma, { email: "os-review@test.com" });
    const course = await createTestCourse(prisma);
    const session = createMockSession({ id: user.id });

    const first = await sync({ type: "REVIEW", payload: { courseId: course.id, rating: 4, comment: "bom" } }, session);
    expect(first.status).toBe(200);

    await sync({ type: "REVIEW", payload: { courseId: course.id, rating: 5, comment: "ótimo" } }, session);

    const review = await prisma.review.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    expect(review?.rating).toBe(5);
    expect(review?.comment).toBe("ótimo");

    const count = await prisma.review.count({ where: { courseId: course.id } });
    expect(count).toBe(1);
  });
});
