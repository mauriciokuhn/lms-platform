import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyUser } from "@/lib/event-bus";
import { logger } from "@/lib/logger";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/notifications/weekly-summary
 *
 * Creates (at most once per 7-day window, per user) a notification with the
 * student's study stats for the last 7 days: lessons completed, XP gained and
 * current streak. Called by the dashboard on load — no cron needed.
 *
 * Response: { created: boolean }
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - WEEK_MS);

    // Idempotency: only one weekly summary per 7-day window
    const existing = await db.notification.findFirst({
      where: {
        userId: session.user.id,
        title: { startsWith: "Resumo da Semana" },
        createdAt: { gte: weekAgo },
      },
    });
    if (existing) {
      return NextResponse.json({ created: false });
    }

    const [lessonsCompleted, achievements, streak] = await Promise.all([
      db.lessonProgress.count({
        where: {
          userId: session.user.id,
          completed: true,
          completedAt: { gte: weekAgo },
        },
      }),
      db.achievement.findMany({
        where: { userId: session.user.id, createdAt: { gte: weekAgo } },
        select: { xpGained: true },
      }),
      db.userStreak.findUnique({ where: { userId: session.user.id } }),
    ]);

    // Only send a summary when there is something to celebrate
    if (lessonsCompleted === 0) {
      return NextResponse.json({ created: false });
    }

    const xpGained = lessonsCompleted * 50 + achievements.reduce((acc, a) => acc + a.xpGained, 0);
    const streakDays = streak?.currentStreak || 0;

    await notifyUser(session.user.id, {
      type: "ACHIEVEMENT_EARNED",
      title: "Resumo da Semana 📊",
      message: `Você completou ${lessonsCompleted} ${lessonsCompleted === 1 ? "aula" : "aulas"} (+${xpGained} XP) na última semana${
        streakDays > 0 ? ` e está com streak de ${streakDays} ${streakDays === 1 ? "dia" : "dias"} 🔥` : ""
      }. Continue assim!`,
      link: "/dashboard",
    });

    return NextResponse.json({ created: true });
  } catch (error) {
    logger.error("POST /api/notifications/weekly-summary error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao gerar resumo semanal" }, { status: 500 });
  }
}
