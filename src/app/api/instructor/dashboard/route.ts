import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const instructorId = session.user.id;

    const [courses, totalEnrollments, totalCompleted, totalReviewsAgg, pendingCount] = await Promise.all([
      db.course.findMany({
        where: { instructorId },
        include: {
          modules: { include: { lessons: { select: { id: true } } } },
          _count: { select: { enrollments: true } },
          reviews: { select: { rating: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.enrollment.count({
        where: { course: { instructorId } },
      }),
      db.enrollment.count({
        where: { course: { instructorId }, status: "COMPLETED" },
      }),
      db.review.count({
        where: { course: { instructorId } },
      }),
      db.course.count({
        where: { instructorId, approvalStatus: "pending" },
      }),
    ]);

    const totalLessons = courses.reduce((acc, c) => acc + c.modules.reduce((mAcc, m) => mAcc + m.lessons.length, 0), 0);
    const allRatings = courses.flatMap((c) => c.reviews.map((r) => r.rating));
    const avgRating = allRatings.length > 0
      ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10
      : null;

    const formattedCourses = courses.map((course) => {
      const courseRatings = course.reviews.map((r) => r.rating);
      const totalR = courseRatings.length;

      return {
        id: course.id,
        title: course.title,
        category: course.category,
        published: course.published,
        approvalStatus: course.approvalStatus || "draft",
        studentsCount: course._count.enrollments,
        lessonsCount: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
        averageRating: totalR > 0 ? Math.round((courseRatings.reduce((a, b) => a + b, 0) / totalR) * 10) / 10 : null,
        totalReviews: totalR,
      };
    });

    return NextResponse.json({
      coursesCount: courses.length,
      totalLessons,
      totalEnrollments,
      totalCompleted,
      pendingApprovalCount: pendingCount,
      completionRate: totalEnrollments > 0 ? Math.round((totalCompleted / totalEnrollments) * 100) : 0,
      totalReviews: totalReviewsAgg,
      averageRating: avgRating,
      courses: formattedCourses,
    });
  } catch (error) {
    logger.error("GET /api/instructor/dashboard error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar dados do instrutor" }, { status: 500 });
  }
}
