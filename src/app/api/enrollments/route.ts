import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

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

    // Calculate progress for each enrollment
    const result = await Promise.all(
      enrollments.map(async (enrollment) => {
        const totalLessons = enrollment.course.modules.reduce(
          (acc, m) => acc + m.lessons.length, 0
        );

        const completedLessons = await db.lessonProgress.count({
          where: {
            userId: session.user.id,
            completed: true,
            lesson: {
              module: {
                courseId: enrollment.courseId,
              },
            },
          },
        });

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
          progress: {
            total: totalLessons,
            completed: completedLessons,
            percentage: totalLessons > 0
              ? Math.round((completedLessons / totalLessons) * 100)
              : 0,
          },
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/enrollments error:", error);
    return NextResponse.json({ error: "Erro ao buscar matrículas" }, { status: 500 });
  }
}
