import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Aggregate enrollment data as a proxy for "sales" (since courses are free)
    const [totalEnrollments, completedEnrollments, enrollmentsByCourse, recentEnrollments] = await Promise.all([
      db.enrollment.count(),
      db.enrollment.count({ where: { status: "COMPLETED" } }),
      db.enrollment.groupBy({
        by: ["courseId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      db.enrollment.findMany({
        take: 20,
        orderBy: { enrolledAt: "desc" },
        include: {
          user: { select: { name: true, email: true, image: true } },
          course: { select: { id: true, title: true } },
        },
      }),
    ]);

    // Get course details for the grouped enrollments
    const courseIds = enrollmentsByCourse.map((e) => e.courseId);
    const courses = courseIds.length > 0
      ? await db.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true, category: true },
        })
      : [];
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const topCourses = enrollmentsByCourse.map((e) => ({
      courseId: e.courseId,
      title: courseMap.get(e.courseId)?.title || "Curso removido",
      category: courseMap.get(e.courseId)?.category || null,
      enrollments: e._count.id,
    }));

    // Monthly enrollment trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyData = await db.enrollment.findMany({
      where: { enrolledAt: { gte: twelveMonthsAgo } },
      select: { enrolledAt: true },
      orderBy: { enrolledAt: "asc" },
    });

    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, 0);
    }
    monthlyData.forEach((e) => {
      if (!e.enrolledAt) return;
      const key = `${e.enrolledAt.getFullYear()}-${String(e.enrolledAt.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    });

    const monthlyEnrollments = Array.from(monthlyMap.entries())
      .map(([month, count]) => ({ month, enrollments: count }))
      .reverse();

    return NextResponse.json({
      summary: {
        totalEnrollments,
        completedEnrollments,
        completionRate: totalEnrollments > 0
          ? Math.round((completedEnrollments / totalEnrollments) * 100)
          : 0,
        averagePerCourse: courses.length > 0
          ? Math.round(totalEnrollments / courses.length)
          : 0,
      },
      topCourses,
      monthlyEnrollments,
      recentEnrollments: recentEnrollments.map((e) => ({
        id: e.id,
        userName: e.user.name || e.user.email,
        userEmail: e.user.email,
        courseTitle: e.course.title,
        courseUrl: `/cursos/${e.course.id}`,
        enrolledAt: e.enrolledAt?.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("GET /api/admin/sales error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao carregar vendas" }, { status: 500 });
  }
}
