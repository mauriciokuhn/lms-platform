/**
 * Route-level tests for POST /api/courses/[id]/enroll and GET /api/enrollments.
 *
 * Covers the auth guard, 404 for missing courses (instead of a raw FK
 * failure -> 500), duplicate-enrollment 409, the confirmation notification,
 * and the progress computation returned by the list endpoint.
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

import type { NextRequest } from "next/server";
import { POST as Enroll } from "@/app/api/courses/[id]/enroll/route";
import { GET as ListEnrollments } from "@/app/api/enrollments/route";
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

function enroll(courseId: string, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request(`http://localhost/api/courses/${courseId}/enroll`, {
    method: "POST",
  }) as unknown as NextRequest;
  return Enroll(req, { params: Promise.resolve({ id: courseId }) });
}

function list(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return ListEnrollments();
}

describe("Enrollments route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    const res = await enroll("any-course");
    expect(res.status).toBe(401);

    const listRes = await list();
    expect(listRes.status).toBe(401);
  });

  it("returns 404 when the course does not exist", async () => {
    const user = await createTestUser(prisma, { email: "enr-404@test.com" });
    const session = createMockSession({ id: user.id });
    const res = await enroll("curso-inexistente", session);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain("não encontrado");
  });

  it("enrolls the user and creates a confirmation notification", async () => {
    const user = await createTestUser(prisma, { email: "enr-ok@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma, { title: "Curso de Teste" });

    const res = await enroll(course.id, session);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("ACTIVE");

    const notif = await prisma.notification.findFirst({
      where: { userId: user.id, type: "ENROLLMENT_CONFIRMED" },
    });
    expect(notif?.message).toContain("Curso de Teste");
  });

  it("returns 409 when already enrolled", async () => {
    const user = await createTestUser(prisma, { email: "enr-dup@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);

    const first = await enroll(course.id, session);
    expect(first.status).toBe(201);

    const second = await enroll(course.id, session);
    expect(second.status).toBe(409);
    expect((await second.json()).error).toContain("já está matriculado");
  });

  it("lists enrollments with progress computation", async () => {
    const user = await createTestUser(prisma, { email: "enr-list@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    const lesson = await createTestLesson(prisma, mod.id);

    await enroll(course.id, session);

    // Complete one lesson out of one -> 100%
    await prisma.lessonProgress.create({
      data: { userId: user.id, lessonId: lesson.id, completed: true, watchedSeconds: 300 },
    });

    const res = await list(session);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data).toHaveLength(1);
    expect(data[0].course.id).toBe(course.id);
    expect(data[0].progress).toEqual({ total: 1, completed: 1, percentage: 100 });
  });

  it("lists enrollments with 0% progress when nothing is completed", async () => {
    const user = await createTestUser(prisma, { email: "enr-zero@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    await createTestLesson(prisma, mod.id);

    await enroll(course.id, session);

    const res = await list(session);
    const data = await res.json();

    expect(data[0].progress).toEqual({ total: 1, completed: 0, percentage: 0 });
  });
});
