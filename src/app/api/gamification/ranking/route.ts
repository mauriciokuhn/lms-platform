import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ranking = await cache.getOrSet(
      "gamification:ranking:top20",
      async () => {
        return db.userXP.findMany({
          where: { user: { role: "STUDENT" } },
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { xp: "desc" },
          take: 20,
        });
      },
      30 // cache for 30 seconds
    );

    const formatted = ranking.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      name: entry.user.name || entry.user.email,
      email: entry.user.email,
      image: entry.user.image,
      xp: entry.xp,
      level: entry.level,
    }));

    // Find current user's position
    const currentUserRank = ranking.findIndex((r) => r.userId === session.user.id) + 1;

    // If current user not in top 20, get their position
    let userRank = currentUserRank;
    if (currentUserRank === 0) {
      const currentUserXP = await db.userXP.findUnique({
        where: { userId: session.user.id },
      });

      if (currentUserXP) {
        const higherCount = await db.userXP.count({
          where: {
            xp: { gt: currentUserXP.xp },
            user: { role: "STUDENT" },
          },
        });
        userRank = higherCount + 1;
      }
    }

    return NextResponse.json({
      ranking: formatted,
      userRank: userRank > 0 ? userRank : null,
      totalStudents: await db.user.count({ where: { role: "STUDENT" } }),
    });
  } catch (error) {
    console.error("GET /api/gamification/ranking error:", error);
    return NextResponse.json({ error: "Erro ao buscar ranking" }, { status: 500 });
  }
}
