import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const range = req.nextUrl.searchParams.get("range") || "30d";
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Monthly enrollments
    const enrollments = await db.enrollment.findMany({
      where: { enrolledAt: { gte: startDate } },
      orderBy: { enrolledAt: "asc" },
    });

    const monthlyMap = new Map<string, number>();
    enrollments.forEach((e) => {
      const month = e.enrolledAt
        ? `${e.enrolledAt.getFullYear()}-${String(e.enrolledAt.getMonth() + 1).padStart(2, "0")}`
        : "unknown";
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
    });
    const monthlyEnrollments = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, enrollments: count }))
      .slice(-12);

    // 2. Completion by course
    const courses = await db.course.findMany({
      include: {
        _count: { select: { enrollments: true } },
        enrollments: { where: { status: "COMPLETED" } },
      },
    });
    const completionByCourse = courses.map((c) => ({
      course: c.title.length > 20 ? c.title.slice(0, 20) + "..." : c.title,
      total: c._count.enrollments,
      completed: c.enrollments.length,
      rate: c._count.enrollments > 0
        ? Math.round((c.enrollments.length / c._count.enrollments) * 100)
        : 0,
    })).sort((a, b) => b.total - a.total);

    // 3. Quiz score distribution
    const attempts = await db.quizAttempt.findMany({
      where: { completedAt: { gte: startDate } },
    });
    const distMap = new Map<string, number>();
    distMap.set("0-20%", 0);
    distMap.set("21-40%", 0);
    distMap.set("41-60%", 0);
    distMap.set("61-80%", 0);
    distMap.set("81-100%", 0);
    attempts.forEach((a) => {
      if (a.score <= 20) distMap.set("0-20%", (distMap.get("0-20%") || 0) + 1);
      else if (a.score <= 40) distMap.set("21-40%", (distMap.get("21-40%") || 0) + 1);
      else if (a.score <= 60) distMap.set("41-60%", (distMap.get("41-60%") || 0) + 1);
      else if (a.score <= 80) distMap.set("61-80%", (distMap.get("61-80%") || 0) + 1);
      else distMap.set("81-100%", (distMap.get("81-100%") || 0) + 1);
    });
    const quizScoreDistribution = Array.from(distMap.entries())
      .map(([range, count]) => ({ range, count }))
      .filter((d) => d.count > 0);

    // 4. Engagement heatmap (mock data based on progress timestamps)
    const progressRecords = await db.lessonProgress.findMany({
      where: { lastAccessedAt: { gte: startDate } },
    });
    const heatmapMap = new Map<string, number>();
    const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    progressRecords.forEach((p) => {
      if (!p.lastAccessedAt) return;
      const day = daysOfWeek[p.lastAccessedAt.getDay()];
      const hour = p.lastAccessedAt.getHours();
      // Round to nearest 3-hour block
      const block = Math.floor(hour / 3) * 3;
      const key = `${day}-${block}`;
      heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
    });
    const engagementHeatmap = Array.from(heatmapMap.entries()).map(([key, value]) => {
      const [day, hourStr] = key.split("-");
      return { day, hour: parseInt(hourStr), value };
    });

    // 5. Top courses
    const topCourses = completionByCourse
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((c) => ({
        course: c.course,
        students: c.total,
        completionRate: c.rate,
      }));

    // 6. Daily active users (based on lesson access per day)
    const dailyMap = new Map<string, number>();
    progressRecords.forEach((p) => {
      if (!p.lastAccessedAt) return;
      const date = p.lastAccessedAt.toISOString().split("T")[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    });
    const dailyActiveUsers = Array.from(dailyMap.entries())
      .map(([date, users]) => ({ date: date.slice(5), users }))
      .slice(-30);

    return NextResponse.json({
      monthlyEnrollments,
      completionByCourse,
      quizScoreDistribution,
      engagementHeatmap,
      topCourses,
      dailyActiveUsers,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Erro ao carregar analytics" }, { status: 500 });
  }
}
