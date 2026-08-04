import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const instructor = await db.user.findUnique({
      where: { id, role: "INSTRUCTOR" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        headline: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!instructor) {
      return NextResponse.json({ error: "Instrutor não encontrado" }, { status: 404 });
    }

    const courses = await db.course.findMany({
      where: { instructorId: id },
      include: {
        modules: {
          include: { lessons: { select: { id: true, duration: true } } },
        },
        _count: { select: { enrollments: true, reviews: true } },
        reviews: { select: { rating: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Course stats
    const coursesFormatted = courses.map((c) => {
      const ratings = c.reviews.map((r) => r.rating);
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null;

      return {
        id: c.id,
        title: c.title,
        category: c.category,
        published: c.published,
        approvalStatus: c.approvalStatus || "draft",
        rejectionReason: c.rejectionReason,
        modulesCount: c.modules.length,
        lessonsCount: c.modules.reduce((acc, m) => acc + m.lessons.length, 0),
        totalDuration: c.modules.reduce((acc, m) => acc + m.lessons.reduce((lAcc, l) => lAcc + (l.duration || 0), 0), 0),
        studentsCount: c._count.enrollments,
        totalReviews: c._count.reviews,
        averageRating: avgRating,
        createdAt: c.createdAt.toISOString(),
      };
    });

    const totalStudents = courses.reduce((acc, c) => acc + c._count.enrollments, 0);
    const totalDurations = coursesFormatted.reduce((acc, c) => acc + c.totalDuration, 0);

    // Enrollments over time (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentEnrollments = await db.enrollment.findMany({
      where: {
        course: { instructorId: id },
        enrolledAt: { gte: sixMonthsAgo },
      },
      orderBy: { enrolledAt: "asc" },
      select: { enrolledAt: true },
    });

    const monthlyEnrollments = Array.from({ length: 6 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - 5 + i);
      const monthStr = month.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const count = recentEnrollments.filter((e) => {
        if (!e.enrolledAt) return false;
        const d = new Date(e.enrolledAt);
        return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
      }).length;
      return { month: monthStr, count };
    });

    const totalLessonsCompleted = await db.lessonProgress.count({
      where: {
        completed: true,
        lesson: {
          module: {
            course: { instructorId: id },
          },
        },
      },
    });

    return NextResponse.json({
      instructor,
      metrics: {
        totalCourses: courses.length,
        publishedCourses: courses.filter((c) => c.published).length,
        pendingCourses: courses.filter((c) => c.approvalStatus === "pending").length,
        draftCourses: courses.filter((c) => c.approvalStatus === "draft" || !c.approvalStatus).length,
        rejectedCourses: courses.filter((c) => c.approvalStatus === "rejected").length,
        totalStudents,
        totalEnrollments: courses.reduce((acc, c) => acc + c._count.enrollments, 0),
        totalLessonsCompleted,
        totalHours: Math.round(totalDurations / 60),
        averageRating: coursesFormatted.filter((c) => c.averageRating).reduce((acc, c, _, arr) => acc + (c.averageRating || 0) / arr.length, 0),
        totalReviews: coursesFormatted.reduce((acc, c) => acc + c.totalReviews, 0),
      },
      courses: coursesFormatted,
      monthlyEnrollments,
      memberSince: instructor.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error("GET /api/admin/instructor-metrics/[id] error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar métricas do instrutor" }, { status: 500 });
  }
}
