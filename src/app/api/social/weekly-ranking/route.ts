import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";

function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { start: weekStart, end: weekEnd } = getWeekBounds();

    const weeklyRanking = await cache.getOrSet(
      `social:weekly-ranking:${weekStart.toISOString().slice(0, 10)}`,
      async () => {
        // Get XP earned this week from achievements
        const achievements = await db.achievement.findMany({
          where: {
            createdAt: { gte: weekStart, lt: weekEnd },
          },
          select: {
            userId: true,
            xpGained: true,
            user: {
              select: { id: true, name: true, image: true, email: true },
            },
          },
        });

        // Aggregate XP by user
        const xpMap = new Map<
          string,
          { user: { id: string; name: string | null; image: string | null; email: string }; xp: number }
        >();
        for (const a of achievements) {
          const existing = xpMap.get(a.userId);
          if (existing) {
            existing.xp += a.xpGained;
          } else {
            xpMap.set(a.userId, { user: a.user, xp: a.xpGained });
          }
        }

        // Sort by XP descending
        const sorted = Array.from(xpMap.entries())
          .map(([userId, data]) => ({
            userId,
            name: data.user.name || data.user.email,
            image: data.user.image,
            xpGained: data.xp,
          }))
          .sort((a, b) => b.xpGained - a.xpGained)
          .slice(0, 20);

        return sorted;
      },
      60 // cache for 1 minute
    );

    // Get current user's position
    const currentUserEntry = weeklyRanking.find((e) => e.userId === session.user.id);
    let userRank: number | null = null;
    if (currentUserEntry) {
      userRank = weeklyRanking.indexOf(currentUserEntry) + 1;
    }

    // Get current user's weekly XP
    const currentUserXp = weeklyRanking.find((e) => e.userId === session.user.id)?.xpGained || 0;

    const totalParticipants = await db.achievement.count({
      where: {
        createdAt: { gte: weekStart, lt: weekEnd },
      },
    });

    return NextResponse.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      ranking: weeklyRanking.map((entry, index) => ({
        rank: index + 1,
        ...entry,
      })),
      userRank,
      userXpGained: currentUserXp,
      totalParticipants,
    });
  } catch (error) {
    console.error("GET /api/social/weekly-ranking error:", error);
    return NextResponse.json({ error: "Erro ao buscar ranking semanal" }, { status: 500 });
  }
}
