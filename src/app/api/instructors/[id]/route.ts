import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const instructor = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        headline: true,
        bio: true,
        courses: {
          where: { published: true },
          include: {
            modules: { include: { lessons: { select: { id: true } } } },
            _count: { select: { enrollments: true } },
            reviews: { select: { rating: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!instructor) {
      return NextResponse.json({ error: "Instrutor não encontrado" }, { status: 404 });
    }

    const courses = instructor.courses.map((course) => {
      const reviewRatings = course.reviews.map((r) => r.rating);
      const totalReviews = reviewRatings.length;
      const averageRating =
        totalReviews > 0
          ? Math.round((reviewRatings.reduce((a, b) => a + b, 0) / totalReviews) * 10) / 10
          : null;

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        modulesCount: course.modules.length,
        lessonsCount: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
        studentsCount: course._count.enrollments,
        averageRating,
        totalReviews,
      };
    });

    const totalStudents = courses.reduce((acc, c) => acc + c.studentsCount, 0);

    return NextResponse.json({
      id: instructor.id,
      name: instructor.name,
      email: instructor.email,
      image: instructor.image,
      headline: instructor.headline,
      bio: instructor.bio,
      coursesCount: courses.length,
      totalStudents,
      courses,
    });
  } catch (error) {
    logger.error("GET /api/instructors/[id] error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar instrutor" }, { status: 500 });
  }
}
