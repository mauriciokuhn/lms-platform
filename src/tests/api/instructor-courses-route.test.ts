/**
 * Route-level tests for POST/GET /api/instructor/courses.
 *
 * Exercises the real handlers: INSTRUCTOR-only guard, required-field
 * validation, draft-on-create semantics (pending admin approval), and the
 * GET list restricted to the instructor's own courses.
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

vi.mock("@/lib/cache", () => ({
  cache: {
    getOrSet: vi.fn(async (_key: string, fetcher: () => unknown) => fetcher()),
    invalidate: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
  },
}));

import { POST, GET } from "@/app/api/instructor/courses/route";
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

function postCourse(body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request("http://localhost/api/instructor/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("Instructor courses route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 for anonymous, students and admins", async () => {
    expect((await postCourse({ title: "X", description: "Y" })).status).toBe(401);

    const student = await createTestUser(prisma, { email: "ic-student@test.com" });
    const studentRes = await postCourse(
      { title: "X", description: "Y" },
      createMockSession({ id: student.id, role: "STUDENT" })
    );
    expect(studentRes.status).toBe(401);

    const admin = await createTestUser(prisma, { email: "ic-admin@test.com", role: "ADMIN" });
    const adminRes = await postCourse(
      { title: "X", description: "Y" },
      createMockSession({ id: admin.id, role: "ADMIN" })
    );
    expect(adminRes.status).toBe(401);
  });

  it("rejects missing title or description", async () => {
    const instructor = await createTestUser(prisma, { email: "ic-missing@test.com", role: "INSTRUCTOR" });
    const session = createMockSession({ id: instructor.id, role: "INSTRUCTOR" });

    expect((await postCourse({ description: "sem título" }, session)).status).toBe(400);
    expect((await postCourse({ title: "sem descrição" }, session)).status).toBe(400);
  });

  it("creates a draft course owned by the instructor", async () => {
    const instructor = await createTestUser(prisma, { email: "ic-create@test.com", role: "INSTRUCTOR" });
    const session = createMockSession({ id: instructor.id, role: "INSTRUCTOR" });

    const res = await postCourse(
      { title: "Meu Curso", description: "Descrição", category: "Design" },
      session
    );
    expect(res.status).toBe(201);
    const course = await res.json();
    expect(course.title).toBe("Meu Curso");
    expect(course.published).toBe(false);
    expect(course.approvalStatus).toBe("draft");
    expect(course.instructorId).toBe(instructor.id);
  });

  it("GET returns only the instructor's own courses with derived counts", async () => {
    const instructor = await createTestUser(prisma, { email: "ic-list@test.com", role: "INSTRUCTOR" });
    const other = await createTestUser(prisma, { email: "ic-other@test.com", role: "INSTRUCTOR" });
    const session = createMockSession({ id: instructor.id, role: "INSTRUCTOR" });

    const mine = await createTestCourse(prisma, { title: "Do Instrutor", instructorId: instructor.id, published: false });
    const mod = await prisma.module.create({ data: { title: "M", orderIndex: 1, courseId: mine.id } });
    await prisma.lesson.create({
      data: { title: "L", contentType: "VIDEO", contentUrl: "https://youtube.com/embed/x", duration: 60, orderIndex: 1, moduleId: mod.id },
    });
    await createTestCourse(prisma, { title: "De Outro", instructorId: other.id });

    authMock.auth.mockResolvedValue(session);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Do Instrutor");
    expect(data[0].lessonsCount).toBe(1);
    expect(data[0].approvalStatus).toBe("draft");
    expect(data[0].studentsCount).toBe(0);
  });

  it("GET requires instructor role", async () => {
    const student = await createTestUser(prisma, { email: "ic-get-student@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    expect((await GET()).status).toBe(401);
  });
});
