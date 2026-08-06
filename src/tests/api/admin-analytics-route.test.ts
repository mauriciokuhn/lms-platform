/**
 * Route-level tests for GET /api/admin/analytics.
 *
 * Exercises the real handler: ADMIN-only guard, the range parameter
 * (7d/90d/default 30d), and the shape of the six analytics sections
 * (monthlyEnrollments, completionByCourse, quizScoreDistribution,
 * engagementHeatmap, topCourses, dailyActiveUsers).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { GET } from "@/app/api/admin/analytics/route";
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

function getAnalytics(range?: string, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const url = range ? `http://localhost/api/admin/analytics?range=${range}` : "http://localhost/api/admin/analytics";
  // Real NextRequest so req.nextUrl.searchParams is populated.
  return GET(new NextRequest(url));
}

describe("Admin analytics route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 for anonymous and non-admin users", async () => {
    expect((await getAnalytics()).status).toBe(401);

    const student = await createTestUser(prisma, { email: "aa-student@test.com" });
    const studentRes = await getAnalytics(undefined, createMockSession({ id: student.id, role: "STUDENT" }));
    expect(studentRes.status).toBe(401);
  });

  it("returns empty analytics for an empty database", async () => {
    const admin = await createTestUser(prisma, { email: "aa-admin@test.com", role: "ADMIN" });
    const res = await getAnalytics(undefined, createMockSession({ id: admin.id, role: "ADMIN" }));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.monthlyEnrollments).toEqual([]);
    expect(data.completionByCourse).toEqual([]);
    expect(data.quizScoreDistribution).toEqual([]);
    expect(data.engagementHeatmap).toEqual([]);
    expect(data.topCourses).toEqual([]);
    expect(data.dailyActiveUsers).toEqual([]);
  });

  it("computes analytics with data present", async () => {
    const admin = await createTestUser(prisma, { email: "aa-admin2@test.com", role: "ADMIN" });
    const student = await createTestUser(prisma, { email: "aa-student2@test.com" });
    const session = createMockSession({ id: admin.id, role: "ADMIN" });

    const course = await createTestCourse(prisma, { title: "Curso de Analítica" });
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "ACTIVE", enrolledAt: new Date() },
    });
    const mod = await prisma.module.create({ data: { title: "M", orderIndex: 1, courseId: course.id } });
    const lesson = await prisma.lesson.create({
      data: { title: "L", contentType: "VIDEO", contentUrl: "https://youtube.com/embed/x", duration: 60, orderIndex: 1, moduleId: mod.id },
    });
    await prisma.lessonProgress.create({
      data: { userId: student.id, lessonId: lesson.id, completed: true, watchedSeconds: 60, lastAccessedAt: new Date() },
    });
    // quizAttempt has a required FK to Quiz, so create a real one first.
    const quiz = await prisma.quiz.create({
      data: { title: "Quiz Analítica", passingScore: 70, maxAttempts: 3, courseId: course.id },
    });
    await prisma.quizAttempt.create({
      data: { userId: student.id, quizId: quiz.id, score: 90, answers: "{}", passed: true, completedAt: new Date() },
    });

    const res = await getAnalytics("30d", session);
    expect(res.status).toBe(200);
    const data = await res.json();

    // Monthly enrollment bucketed into the current month
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    expect(data.monthlyEnrollments.some((e: { month: string; enrollments: number }) => e.month === currentMonth && e.enrollments === 1)).toBe(true);

    expect(data.completionByCourse).toHaveLength(1);
    expect(data.completionByCourse[0].total).toBe(1);

    expect(data.quizScoreDistribution.some((d: { range: string; count: number }) => d.range === "81-100%" && d.count === 1)).toBe(true);

    expect(data.engagementHeatmap.length).toBeGreaterThan(0);
    expect(data.dailyActiveUsers.length).toBeGreaterThan(0);
    expect(data.topCourses).toHaveLength(1);
    expect(data.topCourses[0].students).toBe(1);
  });

  it("accepts the 7d and 90d ranges", async () => {
    const admin = await createTestUser(prisma, { email: "aa-admin3@test.com", role: "ADMIN" });
    const session = createMockSession({ id: admin.id, role: "ADMIN" });

    for (const range of ["7d", "90d"]) {
      const res = await getAnalytics(range, session);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.completionByCourse)).toBe(true);
    }
  });
});
