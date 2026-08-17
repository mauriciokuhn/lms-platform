import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { blockDemoUser } from "@/lib/demo-mode";
import { notifyUser } from "@/lib/event-bus";
import { logger } from "@/lib/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Block demo users from submitting quizzes
    const demoBlocked = await blockDemoUser();
    if (demoBlocked) return demoBlocked;

    const { quizId } = await params;
    const body = await request.json();
    const { answers } = body; // answers: Record<questionId, optionId>

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Respostas inválidas" }, { status: 400 });
    }

    // Check max attempts
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz não encontrado" }, { status: 404 });
    }

    const attemptsCount = await db.quizAttempt.count({
      where: { userId: session.user.id, quizId },
    });

    if (attemptsCount >= quiz.maxAttempts) {
      return NextResponse.json(
        { error: `Você já atingiu o limite de ${quiz.maxAttempts} tentativas` },
        { status: 403 }
      );
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;

    const results = quiz.questions.map((question) => {
      const userAnswer = answers[question.id];
      const correctOption = question.options.find((opt) => opt.isCorrect);
      const isCorrect = userAnswer === correctOption?.id;

      if (isCorrect) correctAnswers++;

      return {
        questionId: question.id,
        questionText: question.text,
        userAnswer,
        correctOptionId: correctOption?.id || null,
        correctOptionText: correctOption?.text || null,
        isCorrect,
        options: question.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
      };
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const passed = score >= quiz.passingScore;

    // Set when the certificate is available for this course (created just now
    // or already existing) so the quiz page can link straight to it.
    let certificateCode: string | undefined;

    // Save attempt
    const attempt = await db.quizAttempt.create({
      data: {
        userId: session.user.id,
        quizId,
        score,
        answers: JSON.stringify(answers),
        passed,
        completedAt: new Date(),
      },
    });

    // 🎮 Gamification: award XP for passing quiz
    if (passed) {
      await db.userXP.upsert({
        where: { userId: session.user.id },
        update: { xp: { increment: 100 } },
        create: { userId: session.user.id, xp: 100, level: 1 },
      });

      // Update level
      const xpRecord = await db.userXP.findUnique({ where: { userId: session.user.id } });
      if (xpRecord) {
        const newLevel = Math.floor(xpRecord.xp / 200) + 1;
        if (newLevel > (xpRecord.level || 1)) {
          await db.userXP.update({ where: { userId: session.user.id }, data: { level: newLevel } });
        }
      }

      // 🔔 Notify: quiz passed
      const quizInfo = await db.quiz.findUnique({
        where: { id: quizId },
        select: { title: true, courseId: true },
      });

      if (quizInfo) {
        await notifyUser(session.user.id, {
          type: "QUIZ_PASSED",
          title: score === 100 ? "Quiz Perfeito! 💯" : "Quiz aprovado! 📝",
          message: `Você tirou ${score}% no quiz "${quizInfo.title}".${score === 100 ? " Nota máxima!" : ""}`,
          link: quizInfo.courseId ? `/cursos/${quizInfo.courseId}` : undefined,
        });
      }

      // PERFECT_QUIZ badge (100% score)
      if (score === 100) {
        const perfectBadge = await db.userBadge.findUnique({
          where: { userId_badge: { userId: session.user.id, badge: "PERFECT_QUIZ" } },
        });
        if (!perfectBadge) {
          await db.userBadge.create({
            data: { userId: session.user.id, badge: "PERFECT_QUIZ", title: "Quiz Perfeito! 💯", description: "Tirou 100% em um questionário" },
          });
          await db.achievement.create({
            data: { userId: session.user.id, type: "BADGE", title: "Badge: Quiz Perfeito! 💯", description: "Você acertou todas as questões!", xpGained: 50 },
          });
        }
      }
    }

    // If passed and all lessons completed, check certificate eligibility
    if (passed && quiz.courseId) {
      const course = await db.course.findUnique({
        where: { id: quiz.courseId },
        include: {
          modules: {
            include: {
              lessons: { select: { id: true } },
            },
          },
        },
      });

      if (course) {
        const allLessonIds = course.modules.flatMap((m) =>
          m.lessons.map((l) => l.id)
        );
        const completedLessons = await db.lessonProgress.count({
          where: {
            userId: session.user.id,
            lessonId: { in: allLessonIds },
            completed: true,
          },
        });

        const allCompleted = allLessonIds.length > 0 && completedLessons === allLessonIds.length;

        // Auto-generate certificate if all conditions met
        if (allCompleted) {
          const existingCert = await db.certificate.findUnique({
            where: {
              userId_courseId: {
                userId: session.user.id,
                courseId: quiz.courseId,
              },
            },
          });

          if (!existingCert) {
            certificateCode = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
            await db.certificate.create({
              data: {
                userId: session.user.id,
                courseId: quiz.courseId,
                certificateCode,
              },
            });
          } else {
            certificateCode = existingCert.certificateCode;
          }
        }
      }
    }

    return NextResponse.json({
      attemptId: attempt.id,
      score,
      total: totalQuestions,
      correct: correctAnswers,
      passed,
      passingScore: quiz.passingScore,
      results,
      ...(certificateCode
        ? { certificate: { code: certificateCode } }
        : {}),
    });
  } catch (error) {
    logger.error("POST /api/courses/[id]/quizzes/[quizId]/attempt error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao processar tentativa" }, { status: 500 });
  }
}
