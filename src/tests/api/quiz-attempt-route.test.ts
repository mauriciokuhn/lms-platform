/**
 * Route-level tests for POST /api/courses/[id]/quizzes/[quizId]/attempt.
 *
 * Exercises the actual handler: auth guard, answer validation, 404 for
 * missing quizzes, the max-attempts limit, automatic scoring, XP reward
 * for passing, and the PERFECT_QUIZ badge for a 100% score.
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
import { POST } from "@/app/api/courses/[id]/quizzes/[quizId]/attempt/route";
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

async function createQuizWithQuestions(
  courseId: string,
  opts: { passingScore?: number; maxAttempts?: number } = {}
) {
  return prisma.quiz.create({
    data: {
      title: "Quiz Teste",
      passingScore: opts.passingScore ?? 70,
      maxAttempts: opts.maxAttempts ?? 3,
      courseId,
      questions: {
        create: [
          {
            text: "Quanto é 2+2?",
            orderIndex: 1,
            options: {
              create: [
                { text: "3", isCorrect: false },
                { text: "4", isCorrect: true },
              ],
            },
          },
          {
            text: "Capital do Brasil?",
            orderIndex: 2,
            options: {
              create: [
                { text: "Brasília", isCorrect: true },
                { text: "Rio", isCorrect: false },
              ],
            },
          },
        ],
      },
    },
    include: { questions: { include: { options: true } } },
  });
}

function attemptQuiz(courseId: string, quizId: string, body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request(
    `http://localhost/api/courses/${courseId}/quizzes/${quizId}/attempt`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  ) as unknown as NextRequest;
  return POST(req, { params: Promise.resolve({ id: courseId, quizId }) });
}

function answersFor(quiz: {
  questions: { id: string; options: { id: string; isCorrect: boolean }[] }[];
}): Record<string, string> {
  const result: Record<string, string> = {};
  for (const q of quiz.questions) {
    const correct = q.options.find((o) => o.isCorrect);
    if (correct) result[q.id] = correct.id;
  }
  return result;
}

describe("Quiz attempt route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    const res = await attemptQuiz("c", "q", { answers: {} });
    expect(res.status).toBe(401);
  });

  it("returns 400 when answers are missing or malformed", async () => {
    const user = await createTestUser(prisma, { email: "qa-bad@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);
    const quiz = await createQuizWithQuestions(course.id);

    const noAnswers = await attemptQuiz(course.id, quiz.id, {}, session);
    expect(noAnswers.status).toBe(400);

    const notObject = await attemptQuiz(course.id, quiz.id, { answers: "nope" }, session);
    expect(notObject.status).toBe(400);
  });

  it("returns 404 for a missing quiz", async () => {
    const user = await createTestUser(prisma, { email: "qa-404@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);

    const res = await attemptQuiz(course.id, "quiz-nao-existe", { answers: {} }, session);
    expect(res.status).toBe(404);
  });

  it("enforces the max attempts limit", async () => {
    const user = await createTestUser(prisma, { email: "qa-max@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);
    const quiz = await createQuizWithQuestions(course.id, { maxAttempts: 1 });

    const first = await attemptQuiz(course.id, quiz.id, { answers: {} }, session);
    expect(first.status).toBe(200);

    const second = await attemptQuiz(course.id, quiz.id, { answers: {} }, session);
    expect(second.status).toBe(403);
    expect((await second.json()).error).toContain("limite");
  });

  it("scores 100% and awards XP + PERFECT_QUIZ badge on a perfect answer", async () => {
    const user = await createTestUser(prisma, { email: "qa-perfect@test.com" });
    const session = createMockSession({ id: user.id, email: user.email });
    const course = await createTestCourse(prisma);
    const quiz = await createQuizWithQuestions(course.id);

    const res = await attemptQuiz(course.id, quiz.id, { answers: answersFor(quiz) }, session);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.score).toBe(100);
    expect(data.correct).toBe(2);
    expect(data.total).toBe(2);
    expect(data.passed).toBe(true);

    const xp = await prisma.userXP.findUnique({ where: { userId: user.id } });
    expect(xp?.xp).toBe(100);

    const badge = await prisma.userBadge.findUnique({
      where: { userId_badge: { userId: user.id, badge: "PERFECT_QUIZ" } },
    });
    expect(badge).not.toBeNull();

    const notif = await prisma.notification.findFirst({
      where: { userId: user.id, type: "QUIZ_PASSED" },
    });
    expect(notif).not.toBeNull();
  });

  it("scores 0 and does not pass when all answers are wrong", async () => {
    const user = await createTestUser(prisma, { email: "qa-wrong@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);
    const quiz = await createQuizWithQuestions(course.id);

    const wrong: Record<string, string> = {};
    for (const q of quiz.questions) {
      const incorrect = q.options.find((o) => !o.isCorrect);
      if (incorrect) wrong[q.id] = incorrect.id;
    }

    const res = await attemptQuiz(course.id, quiz.id, { answers: wrong }, session);
    const data = await res.json();

    expect(data.score).toBe(0);
    expect(data.passed).toBe(false);

    const xp = await prisma.userXP.findUnique({ where: { userId: user.id } });
    expect(xp).toBeNull();
  });

  it("computes a partial score (50%) that does not pass with passingScore 70", async () => {
    const user = await createTestUser(prisma, { email: "qa-half@test.com" });
    const session = createMockSession({ id: user.id });
    const course = await createTestCourse(prisma);
    const quiz = await createQuizWithQuestions(course.id, { passingScore: 70 });

    const all = answersFor(quiz);
    const [firstId] = quiz.questions.map((q) => q.id);
    // Answer only the first question correctly; leave the second unanswered.
    const partial: Record<string, string> = { [firstId]: all[firstId] };

    const res = await attemptQuiz(course.id, quiz.id, { answers: partial }, session);
    const data = await res.json();

    expect(data.score).toBe(50);
    expect(data.passed).toBe(false);
  });
});
