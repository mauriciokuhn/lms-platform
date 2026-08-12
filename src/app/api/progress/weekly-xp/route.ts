import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { XP_PER_LESSON } from "@/lib/xp";

const DAYS = 7;
const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * GET /api/progress/weekly-xp
 *
 * Returns the user's XP earned per day over the last 7 days (including
 * today), broken down by lessons completed (+50 XP each) and achievement
 * bonuses. Powers the "Evolução de XP" chart on the dashboard.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (DAYS - 1));

    const [lessons, achievements] = await Promise.all([
      db.lessonProgress.findMany({
        where: { userId, completed: true, completedAt: { gte: start } },
        select: { completedAt: true },
      }),
      db.achievement.findMany({
        where: { userId, createdAt: { gte: start } },
        select: { createdAt: true, xpGained: true },
      }),
    ]);

    // Bucket by local calendar day
    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const base = dayStart(start);
    const buckets = Array.from({ length: DAYS }, () => ({ xp: 0, lessons: 0 }));

    const bucketIndex = (t: number) => Math.floor((t - base) / 86400000);

    for (const l of lessons) {
      if (!l.completedAt) continue;
      const idx = bucketIndex(dayStart(l.completedAt));
      if (idx >= 0 && idx < DAYS) {
        buckets[idx].xp += XP_PER_LESSON;
        buckets[idx].lessons += 1;
      }
    }

    for (const a of achievements) {
      const idx = bucketIndex(dayStart(a.createdAt));
      if (idx >= 0 && idx < DAYS) {
        buckets[idx].xp += a.xpGained;
      }
    }

    const days = buckets.map((b, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      // Local date string (avoid UTC offset shifting the label a day)
      const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      return {
        label: DAY_LABELS[d.getDay()],
        date: localDate,
        xp: b.xp,
        lessons: b.lessons,
      };
    });

    const totalXp = days.reduce((sum, d) => sum + d.xp, 0);
    const totalLessons = days.reduce((sum, d) => sum + d.lessons, 0);

    return NextResponse.json({ days, totalXp, totalLessons });
  } catch (error) {
    logger.error("GET /api/progress/weekly-xp error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao buscar evolução de XP" }, { status: 500 });
  }
}
