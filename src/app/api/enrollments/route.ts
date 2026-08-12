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

    const enrollments = await db.enrollment.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    // All completed lesson ids for this user across the enrolled courses
    // (single query instead of one count per enrollment)
    const completedProgress = await db.lessonProgress.findMany({
      where: {
        userId: session.user.id,
        completed: true,
        lesson: {
          module: {
            courseId: { in: enrollments.map((e) => e.courseId) },
          },
        },
      },
      select: { lessonId: true },
    });
    const completedLessonIds = new Set(completedProgress.map((p) => p.lessonId));

    const result = enrollments.map((enrollment) => {
      const modules = enrollment.course.modules.map((m) => {
        const completed = m.lessons.filter((l) => completedLessonIds.has(l.id)).length;
        const total = m.lessons.length;
        return {
          id: m.id,
          title: m.title,
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });

      const totalLessons = modules.reduce((acc, m) => acc + m.total, 0);
      const completedLessons = modules.reduce((acc, m) => acc + m.completed, 0);

      return {
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt?.toISOString(),
        completedAt: enrollment.completedAt?.toISOString(),
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          category: enrollment.course.category,
          thumbnailUrl: enrollment.course.thumbnailUrl,
        },
        modules,
        progress: {
          total: totalLessons,
          completed: completedLessons,
          percentage: totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0,
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("GET /api/enrollments error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar matrículas" }, { status: 500 });
  }
}
