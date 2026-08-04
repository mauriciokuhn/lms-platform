import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";
import { notifyAllStudents } from "@/lib/event-bus";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    // If showing all (admin), check if user is admin
    if (showAll) {
      const session = await auth();
      if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    const courses = await cache.getOrSet(
      `courses:list:${showAll ? "all" : "published"}`,
      async () => {
        return db.course.findMany({
          where: showAll ? {} : { published: true },
          include: {
            modules: {
              include: {
                lessons: { select: { id: true } },
              },
            },
            _count: { select: { enrollments: true } },
            reviews: {
              select: { rating: true },
            },
            instructor: {
              select: { id: true, name: true, headline: true, image: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });
      },
      60 // cache for 60 seconds
    );

    const formatted = courses.map((course) => {
      const reviewRatings = course.reviews.map((r) => r.rating);
      const totalReviews = reviewRatings.length;
      const averageRating =
        totalReviews > 0
          ? Math.round(
              (reviewRatings.reduce((a, b) => a + b, 0) / totalReviews) * 10
            ) / 10
          : null;

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        thumbnailUrl: course.thumbnailUrl,
        price: course.price,
        published: course.published,
        featured: course.featured,
        instructor: course.instructor
          ? {
              id: course.instructor.id,
              name: course.instructor.name,
              headline: course.instructor.headline,
              image: course.instructor.image,
            }
          : null,
        modulesCount: course.modules.length,
        lessonsCount: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
        studentsCount: course._count.enrollments,
        averageRating,
        totalReviews,
        approvalStatus: course.approvalStatus || (course.published ? "approved" : "draft"),
        rejectionReason: course.rejectionReason,
        createdAt: course.createdAt.toISOString(),
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    logger.error("GET /api/courses error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar cursos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, price, published, instructorId } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Título e descrição são obrigatórios" }, { status: 400 });
    }

    const course = await db.course.create({
      data: {
        title,
        description,
        category: category || null,
        price: price ? parseFloat(price) : null,
        published: published || false,
        instructorId: instructorId || null,
      },
    });

    // 🔔 Notify all students: new course published
    if (course.published) {
      await notifyAllStudents({
        type: "COURSE_PUBLISHED",
        title: "Novo curso disponível! 📢",
        message: `"${course.title}" foi publicado. Confira agora!`,
        link: `/cursos/${course.id}`,
      });
    }

    // Invalidate cache so new course appears immediately
    await cache.invalidate("courses:list:*");

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    logger.error("POST /api/courses error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao criar curso" }, { status: 500 });
  }
}
