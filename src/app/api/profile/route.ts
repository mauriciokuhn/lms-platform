import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { SESSION_COOKIE_NAME, hashSessionToken } from "@/lib/session-token";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    const [user, xp, streak, badges, certificates, enrollments, quizAttempts, recentLogins] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true, headline: true, bio: true, twoFactorEnabled: true, createdAt: true },
      }),
      db.userXP.findUnique({ where: { userId } }),
      db.userStreak.findUnique({ where: { userId } }),
      db.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: "desc" } }),
      db.certificate.findMany({
        where: { userId },
        include: { course: { select: { title: true } } },
        orderBy: { issuedAt: "desc" },
      }),
      db.enrollment.findMany({
        where: { userId },
        include: { course: { select: { id: true, title: true } } },
      }),
      db.quizAttempt.findMany({
        where: { userId, passed: true },
      }),
      db.loginHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, ipHash: true, userAgent: true, sessionTokenHash: true, revokedAt: true, createdAt: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const currentXP = xp?.xp || 0;
    const currentLevel = xp?.level || 1;
    const xpForNextLevel = currentLevel * 200;

    // Get actual lesson progress count
    const lessonProgressCount = await db.lessonProgress.count({
      where: { userId, completed: true },
    });

    const currentSessionHash = request.cookies.get(SESSION_COOKIE_NAME)?.value
      ? await hashSessionToken(request.cookies.get(SESSION_COOKIE_NAME)!.value)
      : null;

    const profile = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        headline: user.headline,
        bio: user.bio,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt.toISOString(),
      },
      xp: {
        current: currentXP,
        level: currentLevel,
        nextLevelAt: xpForNextLevel,
      },
      streak: {
        current: streak?.currentStreak || 0,
        longest: streak?.longestStreak || 0,
      },
      badges: badges.map((b) => ({
        id: b.id,
        badge: b.badge,
        title: b.title,
        description: b.description,
        icon: b.icon,
        earnedAt: b.earnedAt.toISOString(),
      })),
      certificates: certificates.map((c) => ({
        id: c.id,
        courseTitle: c.course.title,
        issuedAt: c.issuedAt.toISOString(),
        code: c.certificateCode,
      })),
      stats: {
        coursesActive: enrollments.filter((e) => e.status === "ACTIVE").length,
        coursesCompleted: enrollments.filter((e) => e.status === "COMPLETED").length,
        lessonsCompleted: lessonProgressCount,
        quizzesPassed: quizAttempts.length,
      },
      recentLogins: recentLogins.map((l) => ({
        id: l.id,
        ipHash: l.ipHash,
        userAgent: l.userAgent,
        createdAt: l.createdAt.toISOString(),
        revoked: l.revokedAt !== null,
        isCurrent:
          l.sessionTokenHash !== null &&
          currentSessionHash !== null &&
          l.sessionTokenHash === currentSessionHash,
      })),
    };

    return NextResponse.json(profile);
  } catch (error) {
    logger.error("GET /api/profile error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao carregar perfil" }, { status: 500 });
  }
}

/**
 * PATCH /api/profile
 *
 * Updates the signed-in user's own account settings. Currently supports
 * `twoFactorEnabled` (email-code 2FA on the next login).
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let twoFactorEnabled: boolean | undefined;
    try {
      const body = (await request.json()) as { twoFactorEnabled?: unknown };
      if (typeof body?.twoFactorEnabled === "boolean") {
        twoFactorEnabled = body.twoFactorEnabled;
      }
    } catch {
      // malformed body
    }

    if (twoFactorEnabled === undefined) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { twoFactorEnabled },
    });

    return NextResponse.json({ ok: true, twoFactorEnabled });
  } catch (error) {
    logger.error("PATCH /api/profile error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}
