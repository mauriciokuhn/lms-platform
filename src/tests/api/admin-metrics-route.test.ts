/**
 * Route-level tests for GET /api/admin/metrics.
 *
 * Exercises the real handler: ADMIN-only guard (401 for students and
 * anonymous), aggregate counters, and the completion-rate calculation.
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

import { GET } from "@/app/api/admin/metrics/route";
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

function getMetrics(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return GET();
}

describe("Admin metrics route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated or not an admin", async () => {
    expect((await getMetrics()).status).toBe(401);

    const student = await createTestUser(prisma, { email: "m-student@test.com" });
    const studentRes = await getMetrics(createMockSession({ id: student.id, role: "STUDENT" }));
    expect(studentRes.status).toBe(401);
  });

  it("returns zeroed metrics for an empty database", async () => {
    const admin = await createTestUser(prisma, { email: "m-admin@test.com", role: "ADMIN" });
    const res = await getMetrics(createMockSession({ id: admin.id, role: "ADMIN" }));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.metrics.totalStudents).toBe(1); // the admin itself is not a student
    expect(data.metrics.totalCourses).toBe(0);
    expect(data.metrics.totalEnrollments).toBe(0);
    expect(data.metrics.completionRate).toBe(0);
  });

  it("computes counters and completion rate correctly", async () => {
    const admin = await createTestUser(prisma, { email: "m-admin2@test.com", role: "ADMIN" });
    // Tests share one DB per file (cleanup runs once), so capture the
    // baseline BEFORE creating this test's students and assert the delta.
    const studentsBefore = await prisma.user.count({ where: { role: "STUDENT" } });
    const student1 = await createTestUser(prisma, { email: "m-s1@test.com" });
    const student2 = await createTestUser(prisma, { email: "m-s2@test.com" });
    const published = await createTestCourse(prisma, { title: "Publicado" });
    const draft = await createTestCourse(prisma, { title: "Rascunho", published: false });

    await prisma.enrollment.create({ data: { userId: student1.id, courseId: published.id, status: "COMPLETED", completedAt: new Date() } });
    await prisma.enrollment.create({ data: { userId: student2.id, courseId: published.id, status: "ACTIVE" } });

    const res = await getMetrics(createMockSession({ id: admin.id, role: "ADMIN" }));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.metrics.totalStudents).toBe(studentsBefore + 2);
    expect(data.metrics.totalCourses).toBe(2);
    expect(data.metrics.totalPublishedCourses).toBe(1);
    expect(data.metrics.totalEnrollments).toBe(2);
    expect(data.metrics.totalCompletedEnrollments).toBe(1);
    expect(data.metrics.completionRate).toBe(50);

    // recent lists should include the activity above
    expect(data.recentEnrollments).toHaveLength(2);
    expect(data.recentStudents.some((s: { email: string }) => s.email === "m-s2@test.com")).toBe(true);
    expect(data.recentStudents.some((s: { email: string }) => s.email === "m-s1@test.com")).toBe(true);

    await prisma.enrollment.deleteMany({ where: { courseId: draft.id } });
  });
});
