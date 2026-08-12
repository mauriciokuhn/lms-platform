import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyUser } from "@/lib/event-bus";
import { sendStreakAtRiskEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Compute whether the user's streak is at risk today.
 *
 * A streak is "at risk" when:
 *  - the user has an active streak (> 0 days)
 *  - their last study day was YESTERDAY (diffDays === 1)
 *  - they have not completed any lesson today
 *
 * In that case, if they don't complete a lesson today, the streak resets
 * tomorrow. If the last activity was 2+ days ago, the streak was already
 * broken — we don't alert for that case.
 */
async function computeStreakStatus(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [streak, completedToday] = await Promise.all([
    db.userStreak.findUnique({ where: { userId } }),
    db.lessonProgress.count({
      where: { userId, completed: true, completedAt: { gte: today } },
    }),
  ]);

  const last = streak?.lastActivityAt ? new Date(streak.lastActivityAt) : null;
  const lastDay = last
    ? new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime()
    : null;
  const diffDays = lastDay !== null ? Math.round((today.getTime() - lastDay) / DAY_MS) : null;

  const atRisk =
    !!streak &&
    streak.currentStreak > 0 &&
    diffDays === 1 &&
    completedToday === 0;

  return {
    atRisk,
    streak: streak?.currentStreak || 0,
    lastActivity: streak?.lastActivityAt?.toISOString() || null,
    completedToday,
  };
}

/**
 * GET /api/progress/streak-alert
 *
 * Returns whether the user's streak is at risk today (no lesson completed
 * since yesterday) so the dashboard can show a warning banner.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const status = await computeStreakStatus(session.user.id);
    return NextResponse.json(status);
  } catch (error) {
    logger.error("GET /api/progress/streak-alert error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao verificar streak" }, { status: 500 });
  }
}

/**
 * POST /api/progress/streak-alert
 *
 * Fires a "streak at risk" notification — at most once per 24h window per
 * user (idempotent, like the weekly summary). The dashboard calls this once
 * per session; the endpoint guards against duplicates.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const status = await computeStreakStatus(session.user.id);
    if (!status.atRisk) {
      return NextResponse.json({ notified: false, atRisk: false });
    }

    // Idempotency: only one "Streak em risco" notification per 24h window.
    const dayAgo = new Date(Date.now() - DAY_MS);
    const existing = await db.notification.findFirst({
      where: {
        userId: session.user.id,
        title: { startsWith: "Streak em risco" },
        createdAt: { gte: dayAgo },
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ notified: false, atRisk: true });
    }

    await notifyUser(session.user.id, {
      type: "XP_GAINED",
      title: "Streak em risco! 🔥",
      message: `Complete uma aula hoje para manter seu streak de ${status.streak} ${status.streak === 1 ? "dia" : "dias"}. Não deixe a sequência quebrar!`,
      link: "/cursos",
    });

    // 📧 Also send an email reminder (graceful if Resend is not configured).
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, name: true },
      });
      if (user?.email) {
        await sendStreakAtRiskEmail(user.email, user.name || "aluno", status.streak);
      }
    } catch (emailError) {
      logger.error("Failed to send streak-at-risk email", {
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return NextResponse.json({ notified: true, atRisk: true });
  } catch (error) {
    logger.error("POST /api/progress/streak-alert error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao emitir alerta de streak" }, { status: 500 });
  }
}
