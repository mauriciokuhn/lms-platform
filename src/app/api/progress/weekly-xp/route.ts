import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";
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

    // ── Personal 30-day average ─────────────────────────────────
    // User's own daily average XP over the last 30 days, so the UI can
    // show whether this week's pace is above or below their personal
    // baseline. Scoped to the user — cheap, no cache needed.
    const monthStart = new Date();
    monthStart.setHours(0, 0, 0, 0);
    monthStart.setDate(monthStart.getDate() - 29); // 30 days including today

    const [monthLessons, monthAchievements] = await Promise.all([
      db.lessonProgress.findMany({
        where: { userId, completed: true, completedAt: { gte: monthStart } },
        select: { completedAt: true },
      }),
      db.achievement.findMany({
        where: { userId, createdAt: { gte: monthStart } },
        select: { xpGained: true },
      }),
    ]);

    let monthXp = 0;
    for (const l of monthLessons) {
      if (l.completedAt) monthXp += XP_PER_LESSON;
    }
    for (const a of monthAchievements) {
      monthXp += a.xpGained;
    }
    const monthAverage = Math.round(monthXp / 30);
    const weekDailyAverage = Math.round(totalXp / 7);

    // ── Platform comparison ─────────────────────────────────────
    // Aggregate the same 7-day window across ALL users (lessons +50 XP
    // each and achievement bonuses) to compute the platform average and
    // the sorted weekly ranking. Cached 60s (same convention as the
    // weekly-ranking route) since it scans all users' activity. The
    // cached payload is USER-AGNOSTIC (sorted [userId, xp] pairs + totals)
    // — the caller's rank is derived AFTER the cache hit, so two students
    // in the same 60s window never see each other's rank.
    const comparison = await cache.getOrSet(
      `progress:weekly-xp:cmp:${start.toISOString().slice(0, 10)}`,
      async () => {
        const [allLessons, allAchievements] = await Promise.all([
          db.lessonProgress.findMany({
            where: { completed: true, completedAt: { gte: start } },
            select: { userId: true, completedAt: true },
          }),
          db.achievement.findMany({
            where: { createdAt: { gte: start } },
            select: { userId: true, createdAt: true, xpGained: true },
          }),
        ]);

        const userWeeklyXp = new Map<string, number>();
        const addXp = (uid: string, xp: number) =>
          userWeeklyXp.set(uid, (userWeeklyXp.get(uid) || 0) + xp);

        for (const l of allLessons) {
          if (!l.completedAt) continue;
          const idx = bucketIndex(dayStart(l.completedAt));
          if (idx >= 0 && idx < DAYS) addXp(l.userId, XP_PER_LESSON);
        }
        for (const a of allAchievements) {
          const idx = bucketIndex(dayStart(a.createdAt));
          if (idx >= 0 && idx < DAYS) addXp(a.userId, a.xpGained);
        }

        const ranks = Array.from(userWeeklyXp.entries()).sort((a, b) => b[1] - a[1]);
        const totalParticipants = ranks.length;
        const platformAverage =
          totalParticipants > 0
            ? Math.round(ranks.reduce((sum, [, xp]) => sum + xp, 0) / totalParticipants)
            : 0;

        return { ranks, totalParticipants, platformAverage };
      },
      60
    );

    const myRankIndex = comparison.ranks.findIndex(([uid]) => uid === userId);
    const weeklyRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
    const topPercent =
      weeklyRank !== null && comparison.totalParticipants > 0
        ? Math.round((weeklyRank / comparison.totalParticipants) * 100)
        : null;

    return NextResponse.json({
      days,
      totalXp,
      totalLessons,
      monthAverage,
      weekDailyAverage,
      weeklyRank,
      totalParticipants: comparison.totalParticipants,
      platformAverage: comparison.platformAverage,
      topPercent,
    });
  } catch (error) {
    logger.error("GET /api/progress/weekly-xp error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao buscar evolução de XP" }, { status: 500 });
  }
}
