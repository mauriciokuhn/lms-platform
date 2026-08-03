/**
 * Route-level tests for the modules & lessons endpoints:
 *   POST/GET /api/courses/[id]/modules
 *   PUT/DELETE /api/courses/[id]/modules/[moduleId]
 *   POST/GET /api/courses/[id]/modules/[moduleId]/lessons
 *   PUT/DELETE /api/courses/[id]/modules/[moduleId]/lessons/[lessonId]
 *
 * GET endpoints are public; mutations are ADMIN-only.
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

import {
  GET as listModules,
  POST as createModule,
} from "@/app/api/courses/[id]/modules/route";
import {
  PUT as updateModule,
  DELETE as deleteModule,
} from "@/app/api/courses/[id]/modules/[moduleId]/route";
import {
  GET as listLessons,
  POST as createLesson,
} from "@/app/api/courses/[id]/modules/[moduleId]/lessons/route";
import {
  PUT as updateLesson,
  DELETE as deleteLesson,
} from "@/app/api/courses/[id]/modules/[moduleId]/lessons/[lessonId]/route";
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

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Modules & lessons routes", () => {
  // NOTE: one single describe for the whole file. cleanupTestDb/closeTestDb
  // must run ONCE per file (they close the shared isolated DB); splitting
  // into two describes would close the DB before the second block runs.
  let courseId: string;
  let moduleId: string;

  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("GET modules is public and ordered by orderIndex", async () => {
    const course = await createTestCourse(prisma);
    courseId = course.id;
    await createTestModule(prisma, course.id, { title: "Módulo 2", orderIndex: 2 });
    await createTestModule(prisma, course.id, { title: "Módulo 1", orderIndex: 1 });

    const res = await listModules(new Request(`http://localhost/api/courses/${course.id}/modules`), {
      params: Promise.resolve({ id: course.id }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.map((m: { title: string }) => m.title)).toEqual(["Módulo 1", "Módulo 2"]);
  });

  it("POST module requires admin", async () => {
    const student = await createTestUser(prisma, { email: "m-post-student@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    const res = await createModule(
      jsonRequest(`http://localhost/api/courses/${courseId}/modules`, "POST", { title: "M" }),
      { params: Promise.resolve({ id: courseId }) }
    );
    expect(res.status).toBe(401);
  });

  it("POST module rejects missing title and auto-increments orderIndex", async () => {
    const admin = await createTestUser(prisma, { email: "m-post-admin@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));

    const missing = await createModule(
      jsonRequest(`http://localhost/api/courses/${courseId}/modules`, "POST", {}),
      { params: Promise.resolve({ id: courseId }) }
    );
    expect(missing.status).toBe(400);

    const res = await createModule(
      jsonRequest(`http://localhost/api/courses/${courseId}/modules`, "POST", { title: "Novo Módulo" }),
      { params: Promise.resolve({ id: courseId }) }
    );
    expect(res.status).toBe(201);
    const mod = await res.json();
    expect(mod.title).toBe("Novo Módulo");
    expect(mod.orderIndex).toBe(3); // next after 1 and 2
  });

  it("PUT and DELETE module require admin", async () => {
    const student = await createTestUser(prisma, { email: "m-mut-student@test.com" });
    const mod = await createTestModule(prisma, courseId, { title: "Para Editar" });

    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    const putDenied = await updateModule(
      jsonRequest(`http://localhost/api/courses/${courseId}/modules/${mod.id}`, "PUT", { title: "X" }),
      { params: Promise.resolve({ id: courseId, moduleId: mod.id }) }
    );
    expect(putDenied.status).toBe(401);
    const delDenied = await deleteModule(new Request(`http://localhost/api/courses/${courseId}/modules/${mod.id}`), {
      params: Promise.resolve({ id: courseId, moduleId: mod.id }),
    });
    expect(delDenied.status).toBe(401);

    const admin = await createTestUser(prisma, { email: "m-mut-admin@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));

    const put = await updateModule(
      jsonRequest(`http://localhost/api/courses/${courseId}/modules/${mod.id}`, "PUT", { title: "Editado" }),
      { params: Promise.resolve({ id: courseId, moduleId: mod.id }) }
    );
    expect(put.status).toBe(200);
    expect((await put.json()).title).toBe("Editado");

    const del = await deleteModule(new Request(`http://localhost/api/courses/${courseId}/modules/${mod.id}`), {
      params: Promise.resolve({ id: courseId, moduleId: mod.id }),
    });
    expect(del.status).toBe(200);
    expect(await prisma.module.findUnique({ where: { id: mod.id } })).toBeNull();
  });

  it("GET lessons is public", async () => {
    const course = await createTestCourse(prisma);
    courseId = course.id;
    const mod = await createTestModule(prisma, course.id);
    moduleId = mod.id;
    await createTestLesson(prisma, mod.id, { title: "Aula 1", orderIndex: 1 });

    const res = await listLessons(
      new Request(`http://localhost/api/courses/${course.id}/modules/${mod.id}/lessons`),
      { params: Promise.resolve({ id: course.id, moduleId: mod.id }) }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Aula 1");
  });

  it("POST lesson requires admin and title + contentType", async () => {
    const admin = await createTestUser(prisma, { email: "l-post-admin@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));

    const missing = await createLesson(
      jsonRequest(`http://localhost/api/courses/${courseId}/modules/${moduleId}/lessons`, "POST", { title: "Sem tipo" }),
      { params: Promise.resolve({ id: courseId, moduleId }) }
    );
    expect(missing.status).toBe(400);

    const res = await createLesson(
      jsonRequest(`http://localhost/api/courses/${courseId}/modules/${moduleId}/lessons`, "POST", {
        title: "Aula Nova",
        contentType: "VIDEO",
        contentUrl: "https://www.youtube.com/embed/abc",
        duration: "120",
      }),
      { params: Promise.resolve({ id: courseId, moduleId }) }
    );
    expect(res.status).toBe(201);
    const lesson = await res.json();
    expect(lesson.title).toBe("Aula Nova");
    expect(lesson.duration).toBe(120);

    const student = await createTestUser(prisma, { email: "l-post-student@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    const denied = await createLesson(
      jsonRequest(`http://localhost/api/courses/${courseId}/modules/${moduleId}/lessons`, "POST", {
        title: "Bloqueada",
        contentType: "VIDEO",
      }),
      { params: Promise.resolve({ id: courseId, moduleId }) }
    );
    expect(denied.status).toBe(401);
  });

  it("PUT and DELETE lesson require admin", async () => {
    const student = await createTestUser(prisma, { email: "l-mut-student@test.com" });
    const lesson = await createTestLesson(prisma, moduleId, { title: "Para Editar" });

    authMock.auth.mockResolvedValue(createMockSession({ id: student.id, role: "STUDENT" }));
    const putDenied = await updateLesson(
      jsonRequest(
        `http://localhost/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`,
        "PUT",
        { title: "X" }
      ),
      { params: Promise.resolve({ id: courseId, moduleId, lessonId: lesson.id }) }
    );
    expect(putDenied.status).toBe(401);

    const admin = await createTestUser(prisma, { email: "l-mut-admin@test.com", role: "ADMIN" });
    authMock.auth.mockResolvedValue(createMockSession({ id: admin.id, role: "ADMIN" }));

    const put = await updateLesson(
      jsonRequest(
        `http://localhost/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`,
        "PUT",
        { title: "Editada", duration: "300" }
      ),
      { params: Promise.resolve({ id: courseId, moduleId, lessonId: lesson.id }) }
    );
    expect(put.status).toBe(200);
    const updated = await put.json();
    expect(updated.title).toBe("Editada");
    expect(updated.duration).toBe(300);

    const del = await deleteLesson(new Request(`http://localhost/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`), {
      params: Promise.resolve({ id: courseId, moduleId, lessonId: lesson.id }),
    });
    expect(del.status).toBe(200);
    expect(await prisma.lesson.findUnique({ where: { id: lesson.id } })).toBeNull();
  });
});
