/**
 * Route-level tests for GET /api/recommendations.
 *
 * Covers the auth guard, exclusion of enrolled courses, category-based
 * scoring (a course matching the student's category ranks first), and the
 * reason strings returned with each recommendation.
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

import { GET } from "@/app/api/recommendations/route";
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

describe("Recommendations route", () => {
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

  it("excludes enrolled courses and returns an empty list when everything is enrolled", async () => {
    const user = await createTestUser(prisma, { email: "rec-all@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id, email: "rec-all@test.com" }));

    const course = await createTestCourse(prisma, { title: "Curso Único", category: "Design" });
    await prisma.enrollment.create({
      data: { userId: user.id, courseId: course.id, status: "ACTIVE" },
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.recommendations).toEqual([]);
  });

  it("ranks a matching-category course first with the interest reason", async () => {
    const user = await createTestUser(prisma, { email: "rec-cat@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id, email: "rec-cat@test.com" }));

    // Student enrolled in a "Programação" course → interested in that category.
    const enrolled = await createTestCourse(prisma, { title: "Curso Atual", category: "Programação" });
    await prisma.enrollment.create({
      data: { userId: user.id, courseId: enrolled.id, status: "ACTIVE" },
    });

    // Give the matching course enrollments + a lesson so its score reaches
    // >= 70 (40 category + 30 popularity + 20 richness + 10 new user + 10
    // beginner), which is required for the "interesse" reason.
    const matching = await createTestCourse(prisma, { title: "Curso Recomendado", category: "Programação" });
    const fans = await Promise.all([
      createTestUser(prisma, { email: "rec-fan1@test.com" }),
      createTestUser(prisma, { email: "rec-fan2@test.com" }),
    ]);
    await prisma.enrollment.createMany({
      data: fans.map((f) => ({ userId: f.id, courseId: matching.id, status: "ACTIVE" })),
    });
    const mod = await createTestModule(prisma, matching.id);
    await createTestLesson(prisma, mod.id);
    await createTestCourse(prisma, { title: "Outro Tema", category: "Design" });

    const res = await GET();
    const data = await res.json();

    // Earlier tests accumulate courses in this file, so assert on the
    // matching course's position and reason instead of an exact length.
    const matchEntry = data.recommendations.find((r: { id: string }) => r.id === matching.id);
    expect(matchEntry).toBeTruthy();
    expect(matchEntry.score).toBeGreaterThanOrEqual(70);
    expect(matchEntry.reason).toContain("interesse");
    expect(data.recommendations[0].id).toBe(matching.id);
  });

  it("returns a 'beginner' reason when the user has no badges", async () => {
    const user = await createTestUser(prisma, { email: "rec-new@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id, email: "rec-new@test.com" }));

    const novice = await createTestCourse(prisma, { title: "Curso Novato", category: "Back-end" });

    const res = await GET();
    const data = await res.json();

    // Don't assert index 0 (other tests' courses may outrank it) — assert the
    // reason on this specific course's entry.
    const entry = data.recommendations.find((r: { id: string }) => r.id === novice.id);
    expect(entry).toBeTruthy();
    expect(entry.reason).toBe("Recomendado para começar");
  });
});
