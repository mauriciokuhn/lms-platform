import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/progress/daily
 *
 * Returns how many lessons the current user completed today plus the
 * daily goal (used by the dashboard "Meta Diária" card).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const completedToday = await db.lessonProgress.count({
      where: {
        userId: session.user.id,
        completed: true,
        completedAt: { gte: startOfToday },
      },
    });

    return NextResponse.json({ completedToday, goal: 3 });
  } catch (error) {
    logger.error("GET /api/progress/daily error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao buscar meta diária" }, { status: 500 });
  }
}
