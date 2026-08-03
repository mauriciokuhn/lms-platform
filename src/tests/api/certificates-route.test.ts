/**
 * Route-level tests for GET /api/certificates and POST /api/certificates/generate.
 *
 * Covers the auth guard, the courseId requirement, 404 for missing courses,
 * the two eligibility gates (100% lessons completed + passed final quiz),
 * idempotency (existing certificate returns 200), and the issued notification.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import type { NextRequest } from "next/server";
import { GET as ListCertificates } from "@/app/api/certificates/route";
import { POST as GenerateCertificate } from "@/app/api/certificates/generate/route";
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

function generate(body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request("http://localhost/api/certificates/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
  return GenerateCertificate(req);
}

function list(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return ListCertificates();
}

async function completeCourseFor(
  userId: string,
  courseId: string,
  opts: { quizPassed?: boolean; lessonsCompleted?: boolean } = {}
) {
  const modules = await prisma.module.findMany({
    where: { courseId },
    include: { lessons: { select: { id: true } } },
  });
  const lessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));

  if (opts.lessonsCompleted !== false) {
    for (const lessonId of lessonIds) {
      await prisma.lessonProgress.create({
        data: { userId, lessonId, completed: true, watchedSeconds: 300 },
      });
    }
  }

  const quiz = await prisma.quiz.findFirst({ where: { courseId } });
  if (quiz && opts.quizPassed === true) {
    await prisma.quizAttempt.create({
      data: {
        userId,
        quizId: quiz.id,
        score: 100,
        answers: "{}",
        passed: true,
        completedAt: new Date(),
      },
    });
  } else if (quiz && opts.quizPassed === false) {
    await prisma.quizAttempt.create({
      data: {
        userId,
        quizId: quiz.id,
        score: 50,
        answers: "{}",
        passed: false,
        completedAt: new Date(),
      },
    });
  }
}

describe("Certificates route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 for the list when not authenticated", async () => {
    const res = await list();
    expect(res.status).toBe(401);
  });

  it("returns an empty list for a user without certificates", async () => {
    const user = await createTestUser(prisma, { email: "cert-list@test.com" });
    const session = createMockSession({ id: user.id });
    const res = await list(session);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns 400 when courseId is missing", async () => {
    const user = await createTestUser(prisma, { email: "cert-noid@test.com" });
    const session = createMockSession({ id: user.id });
    const res = await generate({}, session);
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent course", async () => {
    const user = await createTestUser(prisma, { email: "cert-404@test.com" });
    const session = createMockSession({ id: user.id });
    const res = await generate({ courseId: "nao-existe" }, session);
    expect(res.status).toBe(404);
  });

  it("blocks generation until all lessons are completed", async () => {
    const user = await createTestUser(prisma, { email: "cert-lesson@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    await createTestLesson(prisma, mod.id);

    const res = await generate({ courseId: course.id }, session);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Complete todas as aulas");
    expect(body.progress).toBe("0/1");
  });

  it("blocks generation when the final quiz was not passed", async () => {
    const user = await createTestUser(prisma, { email: "cert-quiz@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    await createTestLesson(prisma, mod.id);
    await prisma.quiz.create({
      data: { title: "Prova final", courseId: course.id, passingScore: 70 },
    });

    // Lessons completed, but the quiz attempt failed.
    await completeCourseFor(user.id, course.id, { quizPassed: false });

    const res = await generate({ courseId: course.id }, session);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("aprovado no questionário");
  });

  it("issues a certificate when all conditions are met", async () => {
    const user = await createTestUser(prisma, { email: "cert-ok@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    await createTestLesson(prisma, mod.id);
    await prisma.quiz.create({
      data: { title: "Prova final", courseId: course.id, passingScore: 70 },
    });

    await completeCourseFor(user.id, course.id, { quizPassed: true });

    const res = await generate({ courseId: course.id }, session);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.certificateCode).toMatch(/^CERT-/);

    const notif = await prisma.notification.findFirst({
      where: { userId: user.id, type: "CERTIFICATE_ISSUED" },
    });
    expect(notif).not.toBeNull();
  });

  it("is idempotent: returns the existing certificate with 200", async () => {
    const user = await createTestUser(prisma, { email: "cert-dup@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    await createTestLesson(prisma, mod.id);
    await prisma.quiz.create({
      data: { title: "Prova final", courseId: course.id, passingScore: 70 },
    });

    await completeCourseFor(user.id, course.id, { quizPassed: true });

    const first = await generate({ courseId: course.id }, session);
    expect(first.status).toBe(201);

    const second = await generate({ courseId: course.id }, session);
    expect(second.status).toBe(200);

    const count = await prisma.certificate.count({
      where: { userId: user.id, courseId: course.id },
    });
    expect(count).toBe(1);
  });
});
