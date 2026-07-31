import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * Offline Sync API
 *
 * Receives queued mutations from IndexedDB and applies them.
 * Called by the Background Sync API when the user comes back online.
 *
 * Mutation types:
 * - ENROLL: { courseId } → creates enrollment
 * - COMPLETE_LESSON: { lessonId, watchedSeconds } → marks lesson progress
 * - SUBMIT_QUIZ: { quizId, answers } → submits quiz attempt
 * - REVIEW: { courseId, rating, comment } → creates review
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const mutation = await request.json();
    const { type, payload } = mutation;

    switch (type) {
      case "ENROLL": {
        await db.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: session.user.id,
              courseId: payload.courseId,
            },
          },
          update: { status: "ACTIVE" },
          create: {
            userId: session.user.id,
            courseId: payload.courseId,
            status: "ACTIVE",
            enrolledAt: new Date(),
          },
        });
        break;
      }

      case "COMPLETE_LESSON": {
        await db.lessonProgress.upsert({
          where: {
            userId_lessonId: {
              userId: session.user.id,
              lessonId: payload.lessonId,
            },
          },
          update: {
            completed: true,
            watchedSeconds: payload.watchedSeconds,
            completedAt: new Date(),
          },
          create: {
            userId: session.user.id,
            lessonId: payload.lessonId,
            completed: true,
            watchedSeconds: payload.watchedSeconds,
            completedAt: new Date(),
          },
        });
        break;
      }

      case "SUBMIT_QUIZ": {
        const quiz = await db.quiz.findUnique({
          where: { id: payload.quizId },
          include: {
            questions: {
              include: { options: true },
            },
            _count: {
              select: {
                attempts: {
                  where: { userId: session.user.id },
                },
              },
            },
          },
        });

        if (!quiz) {
          return NextResponse.json(
            { error: "Quiz não encontrado" },
            { status: 404 }
          );
        }

        if (quiz._count.attempts >= quiz.maxAttempts) {
          return NextResponse.json(
            { error: "Limite de tentativas excedido" },
            { status: 400 }
          );
        }

        let correctCount = 0;
        for (const question of quiz.questions) {
          const userAnswer = payload.answers[question.id];
          const correctOption = question.options.find((o) => o.isCorrect);
          if (correctOption && userAnswer === correctOption.id) {
            correctCount++;
          }
        }

        const totalQuestions = quiz.questions.length;
        const score = totalQuestions > 0
          ? Math.round((correctCount / totalQuestions) * 100)
          : 0;

        await db.quizAttempt.create({
          data: {
            userId: session.user.id,
            quizId: payload.quizId,
            score,
            answers: JSON.stringify(payload.answers),
            passed: score >= quiz.passingScore,
            completedAt: new Date(),
          },
        });
        break;
      }

      case "REVIEW": {
        await db.review.upsert({
          where: {
            userId_courseId: {
              userId: session.user.id,
              courseId: payload.courseId,
            },
          },
          update: {
            rating: payload.rating,
            comment: payload.comment || null,
          },
          create: {
            userId: session.user.id,
            courseId: payload.courseId,
            rating: payload.rating,
            comment: payload.comment || null,
          },
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Tipo de mutação desconhecido: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/offline/sync error:", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar dados offline" },
      { status: 500 }
    );
  }
}
