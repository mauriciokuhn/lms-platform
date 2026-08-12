import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyUser } from "@/lib/event-bus";
import { sendMonthlySummaryEmail } from "@/lib/email";
import { XP_PER_LESSON } from "@/lib/xp";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/monthly-summary
 *
 * Creates (at most once per calendar month, per user) an in-app notification
 * AND sends a monthly email with the student's study stats for the PREVIOUS
 * calendar month: lessons completed, XP gained, badges, courses completed
 * and current streak. Called by the dashboard on load — no cron needed.
 *
 * Response: { created: boolean }
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Window = previous calendar month
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthLabel = monthStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    // Idempotency: only one "Resumo Mensal" notification per summarized month.
    // The title embeds the month label so August's summary never blocks
    // September's (a plain "Resumo Mensal" prefix + createdAt window would
    // always match the previous month's notification and stall forever).
    const summaryTitle = `Resumo Mensal — ${monthLabel}`;
    const existing = await db.notification.findFirst({
      where: {
        userId: session.user.id,
        title: summaryTitle,
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ created: false });
    }

    const [lessonsCompleted, achievements, coursesCompleted, streak] = await Promise.all([
      db.lessonProgress.count({
        where: {
          userId: session.user.id,
          completed: true,
          completedAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      db.achievement.findMany({
        where: { userId: session.user.id, createdAt: { gte: monthStart, lt: monthEnd } },
        select: { xpGained: true },
      }),
      db.enrollment.count({
        where: {
          userId: session.user.id,
          status: "COMPLETED",
          completedAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      db.userStreak.findUnique({ where: { userId: session.user.id } }),
    ]);

    // Only send a summary when there is something to celebrate
    if (lessonsCompleted === 0) {
      return NextResponse.json({ created: false });
    }

    const xpGained = lessonsCompleted * XP_PER_LESSON + achievements.reduce((acc, a) => acc + a.xpGained, 0);
    const streakDays = streak?.currentStreak || 0;
    const badgeCount = achievements.length;

    const message = `Você completou ${lessonsCompleted} ${lessonsCompleted === 1 ? "aula" : "aulas"} (+${xpGained} XP) em ${monthLabel}${
      badgeCount > 0 ? ` e desbloqueou ${badgeCount} ${badgeCount === 1 ? "conquista" : "conquistas"} 🏅` : ""
    }. Continue assim!`;

    await notifyUser(session.user.id, {
      type: "ACHIEVEMENT_EARNED",
      title: summaryTitle,
      message,
      link: "/dashboard",
    });

    // 📧 Monthly email (graceful if Resend is not configured)
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      });
      if (user?.email) {
        await sendMonthlySummaryEmail(user.email, user.name || "aluno", {
          monthLabel,
          lessons: lessonsCompleted,
          xp: xpGained,
          badges: badgeCount,
          coursesCompleted,
          streak: streakDays,
        });
      }
    } catch (emailError) {
      logger.error("Failed to send monthly summary email", {
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return NextResponse.json({ created: true });
  } catch (error) {
    logger.error("POST /api/notifications/monthly-summary error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao gerar resumo mensal" }, { status: 500 });
  }
}
