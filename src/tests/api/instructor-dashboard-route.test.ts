/**
 * Route-level tests for GET /api/instructor/dashboard.
 *
 * Exercises the real handler: INSTRUCTOR-only guard, aggregate metrics
 * (courses, lessons, enrollments, completion rate, pending approval),
 * and per-course stats with average rating.
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

import { GET } from "@/app/api/instructor/dashboard/route";
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

describe("Instructor dashboard route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 for non-instructors", async () => {
    expect((await GET()).status).toBe(401);

    const student = await createTestUser(prisma, { email: "id-student@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    expect((await GET()).status).toBe(401);
  });

  it("returns zeroed metrics for an instructor with no courses", async () => {
    const instructor = await createTestUser(prisma, { email: "id-empty@test.com", role: "INSTRUCTOR" });
    authMock.auth.mockResolvedValue(createMockSession({ id: instructor.id, role: "INSTRUCTOR" }));

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.coursesCount).toBe(0);
    expect(data.totalLessons).toBe(0);
    expect(data.totalEnrollments).toBe(0);
    expect(data.completionRate).toBe(0);
    expect(data.averageRating).toBeNull();
    expect(data.courses).toEqual([]);
  });

  it("computes metrics with lessons, enrollments, reviews and pending count", async () => {
    const instructor = await createTestUser(prisma, { email: "id-metrics@test.com", role: "INSTRUCTOR" });
    const student = await createTestUser(prisma, { email: "id-student2@test.com" });
    const session = createMockSession({ id: instructor.id, role: "INSTRUCTOR" });

    const course = await createTestCourse(prisma, { title: "Curso Rico", instructorId: instructor.id });
    const mod = await prisma.module.create({ data: { title: "M", orderIndex: 1, courseId: course.id } });
    await prisma.lesson.create({
      data: { title: "Aula 1", contentType: "VIDEO", contentUrl: "https://youtube.com/embed/x", duration: 60, orderIndex: 1, moduleId: mod.id },
    });
    await prisma.lesson.create({
      data: { title: "Aula 2", contentType: "TEXT", contentBody: "texto", orderIndex: 2, moduleId: mod.id },
    });
    await prisma.enrollment.create({ data: { userId: student.id, courseId: course.id, status: "COMPLETED", completedAt: new Date() } });
    await prisma.review.create({ data: { userId: student.id, courseId: course.id, rating: 5, comment: "ótimo" } });
    await prisma.course.update({
      where: { id: course.id },
      data: { approvalStatus: "pending" },
    });

    authMock.auth.mockResolvedValue(session);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.coursesCount).toBe(1);
    expect(data.totalLessons).toBe(2);
    expect(data.totalEnrollments).toBe(1);
    expect(data.totalCompleted).toBe(1);
    expect(data.completionRate).toBe(100);
    expect(data.totalReviews).toBe(1);
    expect(data.averageRating).toBe(5);
    expect(data.pendingApprovalCount).toBe(1);

    expect(data.courses).toHaveLength(1);
    expect(data.courses[0].averageRating).toBe(5);
    expect(data.courses[0].totalReviews).toBe(1);
    expect(data.courses[0].studentsCount).toBe(1);
  });
});
