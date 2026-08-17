import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifyUser } from "@/lib/event-bus";
import { sendSecurityDailySummaryEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/security-summary
 *
 * Daily security digest for admins: aggregates the day's security events
 * (successful logins and sessions revoked remotely) and sends ONE
 * consolidated email per day (UTC) — the same dashboard-triggered pattern
 * as the monthly study summary, no cron needed. Idempotent per calendar
 * day per admin via a notification whose title embeds the date.
 *
 * Response: { sent: boolean, alreadySent?: boolean, events?: {...} }
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const dateLabel = dayStart.toLocaleDateString("pt-BR");

    const [logins, distinctUsers, revokedSessions] = await Promise.all([
      db.loginHistory.count({
        where: { createdAt: { gte: dayStart } },
      }),
      db.loginHistory.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: dayStart } },
      }),
      db.loginHistory.findMany({
        where: { revokedAt: { gte: dayStart } },
        select: {
          user: { select: { email: true } },
          revokedAt: true,
        },
        orderBy: { revokedAt: "desc" },
        take: 20,
      }),
    ]);

    const events = {
      logins,
      distinctUsers: distinctUsers.length,
      revokedSessions: revokedSessions.map((r) => ({
        userEmail: r.user.email,
        when: new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(r.revokedAt as Date),
      })),
    };

    // Idempotency: one digest per calendar day per admin.
    const title = `Resumo Diário de Segurança — ${dateLabel}`;
    const existing = await db.notification.findFirst({
      where: { userId: session.user.id, title },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ sent: false, alreadySent: true, events });
    }

    // Quiet day — nothing happened, don't spam the inbox.
    if (events.logins === 0 && events.revokedSessions.length === 0) {
      return NextResponse.json({ sent: false, events });
    }

    const adminUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    await notifyUser(session.user.id, {
      type: "ADMIN_ALERT",
      title,
      message: `${events.logins} ${events.logins === 1 ? "login" : "logins"} registrado${
        events.logins === 1 ? "" : "s"
      } e ${events.revokedSessions.length} sessão(ões) encerrada(s) hoje.`,
      link: "/admin/alunos",
    });

    // 📧 Consolidated email (graceful if Resend is not configured).
    if (adminUser?.email) {
      try {
        await sendSecurityDailySummaryEmail(adminUser.email, { dateLabel, ...events });
      } catch (emailError) {
        logger.error("Failed to send security daily summary email", {
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }
    }

    return NextResponse.json({ sent: true, events });
  } catch (error) {
    logger.error("POST /api/admin/security-summary error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao gerar resumo diário de segurança" }, { status: 500 });
  }
}

/**
 * GET /api/admin/security-summary
 *
 * Returns today's security events for the dashboard card — no email, no
 * notification, no idempotency side effects.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const [logins, distinctUsers, revokedSessions] = await Promise.all([
      db.loginHistory.count({ where: { createdAt: { gte: dayStart } } }),
      db.loginHistory.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: dayStart } },
      }),
      db.loginHistory.findMany({
        where: { revokedAt: { gte: dayStart } },
        select: {
          user: { select: { email: true } },
          revokedAt: true,
        },
        orderBy: { revokedAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      events: {
        logins,
        distinctUsers: distinctUsers.length,
        revokedSessions: revokedSessions.map((r) => ({
          userEmail: r.user.email,
          when: new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(r.revokedAt as Date),
        })),
      },
    });
  } catch (error) {
    logger.error("GET /api/admin/security-summary error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao buscar resumo diário de segurança" }, { status: 500 });
  }
}
