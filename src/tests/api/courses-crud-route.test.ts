/**
 * Route-level tests for the courses CRUD endpoints:
 *   GET  /api/courses            (public list / admin ?all=true)
 *   POST /api/courses            (admin only)
 *   PUT  /api/courses/[id]       (admin or owning instructor)
 *   DELETE /api/courses/[id]     (admin only)
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

// Bypass the in-memory list cache so GET always reads fresh data.
vi.mock("@/lib/cache", () => ({
  cache: {
    getOrSet: vi.fn(async (_key: string, fetcher: () => unknown) => fetcher()),
    invalidate: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
  },
}));

import { GET as listCourses, POST as createCourse } from "@/app/api/courses/route";
import {
  GET as getCourse,
  PUT as updateCourse,
  DELETE as deleteCourse,
} from "@/app/api/courses/[id]/route";
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

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Courses CRUD routes", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("GET lists only published courses for anonymous users", async () => {
    await createTestCourse(prisma, { title: "Curso Visível" });
    await createTestCourse(prisma, { title: "Curso Oculto", published: false });

    const res = await listCourses(new Request("http://localhost/api/courses"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].title).toBe("Curso Visível");
    expect(data[0].averageRating).toBeNull();
    expect(data[0].totalReviews).toBe(0);
  });

  it("GET ?all=true requires admin", async () => {
    const student = await createTestUser(prisma, { email: "c-list-student@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    const denied = await listCourses(new Request("http://localhost/api/courses?all=true"));
    expect(denied.status).toBe(401);

    const admin = await createTestUser(prisma, { email: "c-list-admin@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    const ok = await listCourses(new Request("http://localhost/api/courses?all=true"));
    expect(ok.status).toBe(200);
    const data = await ok.json();
    // includes the hidden draft from the previous test
    expect(data.some((c: { title: string }) => c.title === "Curso Oculto")).toBe(true);
  });

  it("POST requires admin", async () => {
    const student = await createTestUser(prisma, { email: "c-post-student@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    const res = await createCourse(
      jsonRequest("http://localhost/api/courses", "POST", { title: "X", description: "Y" })
    );
    expect(res.status).toBe(401);
  });

  it("POST rejects missing title or description", async () => {
    const admin = await createTestUser(prisma, { email: "c-post-admin@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));

    const noTitle = await createCourse(jsonRequest("http://localhost/api/courses", "POST", { description: "sem título" }));
    expect(noTitle.status).toBe(400);

    const noDesc = await createCourse(jsonRequest("http://localhost/api/courses", "POST", { title: "sem descrição" }));
    expect(noDesc.status).toBe(400);
  });

  it("POST creates a draft course and returns 201", async () => {
    const admin = await createTestUser(prisma, { email: "c-post-admin2@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));

    const res = await createCourse(
      jsonRequest("http://localhost/api/courses", "POST", {
        title: "Curso Novo",
        description: "Descrição nova",
        category: "Programação",
        price: "49.90",
      })
    );
    expect(res.status).toBe(201);
    const course = await res.json();
    expect(course.title).toBe("Curso Novo");
    expect(course.published).toBe(false);
    expect(course.price).toBe(49.9);

    const inDb = await prisma.course.findUnique({ where: { id: course.id } });
    expect(inDb?.category).toBe("Programação");
  });

  it("GET /api/courses/[id] returns 404 for missing course", async () => {
    const res = await getCourse(new Request("http://localhost/api/courses/nope"), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("PUT allows admin to update a course", async () => {
    const admin = await createTestUser(prisma, { email: "c-put-admin@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    const course = await createTestCourse(prisma, { title: "Antes" });

    const res = await updateCourse(
      jsonRequest(`http://localhost/api/courses/${course.id}`, "PUT", { title: "Depois", published: true }),
      { params: Promise.resolve({ id: course.id }) }
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.title).toBe("Depois");
    expect(updated.published).toBe(true);
  });

  it("PUT allows the owning instructor but denies others", async () => {
    const owner = await createTestUser(prisma, { email: "c-instr-owner@test.com", role: "INSTRUCTOR" });
    const stranger = await createTestUser(prisma, { email: "c-instr-stranger@test.com", role: "INSTRUCTOR" });
    const course = await createTestCourse(prisma, { instructorId: owner.id });

    authMock.auth.mockResolvedValue(createMockSession({ id: stranger.id, role: "INSTRUCTOR" }));
    const denied = await updateCourse(
      jsonRequest(`http://localhost/api/courses/${course.id}`, "PUT", { title: "Hack" }),
      { params: Promise.resolve({ id: course.id }) }
    );
    expect(denied.status).toBe(401);

    authMock.auth.mockResolvedValue(createMockSession({ id: owner.id, role: "INSTRUCTOR" }));
    const ok = await updateCourse(
      jsonRequest(`http://localhost/api/courses/${course.id}`, "PUT", { title: "Do Dono" }),
      { params: Promise.resolve({ id: course.id }) }
    );
    expect(ok.status).toBe(200);
    expect((await ok.json()).title).toBe("Do Dono");
  });

  it("DELETE requires admin and removes the course", async () => {
    const admin = await createTestUser(prisma, { email: "c-del-admin@test.com", role: "ADMIN" });
    const student = await createTestUser(prisma, { email: "c-del-student@test.com" });
    const course = await createTestCourse(prisma, { title: "Para Excluir" });

    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    const denied = await deleteCourse(new Request(`http://localhost/api/courses/${course.id}`), {
      params: Promise.resolve({ id: course.id }),
    });
    expect(denied.status).toBe(401);

    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));
    const ok = await deleteCourse(new Request(`http://localhost/api/courses/${course.id}`), {
      params: Promise.resolve({ id: course.id }),
    });
    expect(ok.status).toBe(200);

    const inDb = await prisma.course.findUnique({ where: { id: course.id } });
    expect(inDb).toBeNull();
  });
});
