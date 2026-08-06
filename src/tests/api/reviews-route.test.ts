/**
 * Route-level tests for POST/GET /api/courses/[id]/reviews.
 *
 * Unlike the Prisma-level tests, these exercise the actual route handler:
 * the auth guard (401), rating validation (1-5), comment length (<=1000),
 * 404 for missing courses, and the upsert semantics (one review per
 * user/course, ownership enforced via the session).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
// @/lib/db is a singleton pointing at dev.db; swap it for the isolated
// test client so route handlers write to the throwaway database.
const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import type { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/courses/[id]/reviews/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createTestCourse,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

function postReview(courseId: string, body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request(`http://localhost/api/courses/${courseId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
  return POST(req, { params: Promise.resolve({ id: courseId }) });
}

function getReviews(courseId: string) {
  const req = new Request(`http://localhost/api/courses/${courseId}/reviews`) as unknown as NextRequest;
  return GET(req, { params: Promise.resolve({ id: courseId }) });
}

describe("Reviews route validation", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    const res = await postReview("any-course", { rating: 5 });
    expect(res.status).toBe(401);
  });

  it("rejects rating below 1", async () => {
    const user = await createTestUser(prisma, { email: "r-low@test.com" });
    const session = createMockSession({ id: user.id, email: user.email });
    const res = await postReview("any-course", { rating: 0 }, session);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("1 e 5");
  });

  it("rejects rating above 5", async () => {
    const user = await createTestUser(prisma, { email: "r-high@test.com" });
    const session = createMockSession({ id: user.id, email: user.email });
    const res = await postReview("any-course", { rating: 6 }, session);
    expect(res.status).toBe(400);
  });

  it("rejects missing rating", async () => {
    const user = await createTestUser(prisma, { email: "r-none@test.com" });
    const session = createMockSession({ id: user.id, email: user.email });
    const res = await postReview("any-course", {}, session);
    expect(res.status).toBe(400);
  });

  it("rejects non-numeric rating", async () => {
    const user = await createTestUser(prisma, { email: "r-str@test.com" });
    const session = createMockSession({ id: user.id, email: user.email });
    const res = await postReview("any-course", { rating: "5" }, session);
    expect(res.status).toBe(400);
  });

  it("rejects comment longer than 1000 characters", async () => {
    const user = await createTestUser(prisma, { email: "r-long@test.com" });
    const session = createMockSession({ id: user.id, email: user.email });
    const res = await postReview("any-course", { rating: 5, comment: "a".repeat(1001) }, session);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("1000");
  });

  it("returns 404 for a non-existent course", async () => {
    const user = await createTestUser(prisma, { email: "r-404@test.com" });
    const session = createMockSession({ id: user.id, email: user.email });
    const res = await postReview("course-does-not-exist", { rating: 5 }, session);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain("não encontrado");
  });

  it("creates a review and GET returns average + distribution", async () => {
    const course = await createTestCourse(prisma);
    const users = await Promise.all([
      createTestUser(prisma, { email: "r-avg-1@test.com" }),
      createTestUser(prisma, { email: "r-avg-2@test.com" }),
      createTestUser(prisma, { email: "r-avg-3@test.com" }),
    ]);

    await postReview(course.id, { rating: 5, comment: "Excelente" }, createMockSession({ id: users[0].id }));
    await postReview(course.id, { rating: 4 }, createMockSession({ id: users[1].id }));
    await postReview(course.id, { rating: 3 }, createMockSession({ id: users[2].id }));

    const res = await getReviews(course.id);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.totalReviews).toBe(3);
    expect(data.averageRating).toBe(4);
    expect(data.distribution).toEqual({ 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 });
    // Order is createdAt: desc — ties on the same millisecond make the
    // position non-deterministic, so assert presence instead of index 0.
    expect(data.reviews.some((r: { comment: string | null }) => r.comment === "Excelente")).toBe(true);
    expect(data.reviews).toHaveLength(3);
  });

  it("upserts: updating own review keeps one row; other users keep their own", async () => {
    const course = await createTestCourse(prisma);
    const userA = await createTestUser(prisma, { email: "r-upsert-a@test.com" });
    const userB = await createTestUser(prisma, { email: "r-upsert-b@test.com" });

    const first = await postReview(course.id, { rating: 5 }, createMockSession({ id: userA.id }));
    expect(first.status).toBe(200);

    const updated = await postReview(course.id, { rating: 3, comment: "Revendo" }, createMockSession({ id: userA.id }));
    expect(updated.status).toBe(200);
    expect((await updated.json()).rating).toBe(3);

    await postReview(course.id, { rating: 4 }, createMockSession({ id: userB.id }));

    const count = await prisma.review.count({ where: { courseId: course.id } });
    expect(count).toBe(2);

    const aReview = await prisma.review.findUnique({
      where: { userId_courseId: { userId: userA.id, courseId: course.id } },
    });
    expect(aReview?.rating).toBe(3);
  });
});
