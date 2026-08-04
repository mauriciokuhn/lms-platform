import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    const [xp, streak, badges, achievements] = await Promise.all([
      db.userXP.findUnique({ where: { userId } }),
      db.userStreak.findUnique({ where: { userId } }),
      db.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: "desc" } }),
      db.achievement.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Calculate next level XP threshold
    const currentLevel = xp?.level || 1;
    const currentXP = xp?.xp || 0;
    const xpForNextLevel = currentLevel * 200;
    const xpForCurrentLevel = (currentLevel - 1) * 200;
    const progressInLevel = currentXP - xpForCurrentLevel;
    const levelProgress = Math.min(
      Math.round((progressInLevel / (xpForNextLevel - xpForCurrentLevel)) * 100),
      100
    );

    return NextResponse.json({
      xp: {
        current: currentXP,
        level: currentLevel,
        nextLevelAt: xpForNextLevel,
        levelProgress,
      },
      streak: {
        current: streak?.currentStreak || 0,
        longest: streak?.longestStreak || 0,
        lastActivity: streak?.lastActivityAt?.toISOString() || null,
      },
      badges: badges.map((b) => ({
        id: b.id,
        badge: b.badge,
        title: b.title,
        description: b.description,
        icon: b.icon,
        earnedAt: b.earnedAt.toISOString(),
      })),
      recentAchievements: achievements.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        xpGained: a.xpGained,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("GET /api/gamification/progress error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar progresso" }, { status: 500 });
  }
}
