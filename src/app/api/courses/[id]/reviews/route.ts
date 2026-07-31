import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// ──────────────────────────────────────────
// GET  /api/courses/[id]/reviews
// ──────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [reviews, aggregate, distributionRaw] = await Promise.all([
      db.review.findMany({
        where: { courseId: id },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.review.aggregate({
        where: { courseId: id },
        _avg: { rating: true },
        _count: { id: true },
      }),
      db.review.groupBy({
        by: ["rating"],
        where: { courseId: id },
        _count: { id: true },
      }),
    ]);

    // Build distribution map (1-5 stars, 0 if no reviews)
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const entry of distributionRaw) {
      distribution[entry.rating] = entry._count.id;
    }

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
      })),
      averageRating: aggregate._avg.rating
        ? Math.round(aggregate._avg.rating * 10) / 10
        : null,
      totalReviews: aggregate._count.id,
      distribution,
    });
  } catch (error) {
    console.error("GET /api/courses/[id]/reviews error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar avaliações" },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────
// POST  /api/courses/[id]/reviews
// ──────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const body = await req.json();
    const { rating, comment } = body;

    // Validate rating
    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Avaliação deve ser entre 1 e 5 estrelas" },
        { status: 400 }
      );
    }

    // Validate comment length
    if (comment && comment.length > 1000) {
      return NextResponse.json(
        { error: "Comentário deve ter no máximo 1000 caracteres" },
        { status: 400 }
      );
    }

    // Verify course exists
    const course = await db.course.findUnique({ where: { id } });
    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    // Upsert: one review per user per course
    const review = await db.review.upsert({
      where: {
        userId_courseId: { userId, courseId: id },
      },
      update: { rating, comment, updatedAt: new Date() },
      create: { userId, courseId: id, rating, comment: comment || null },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      user: review.user,
    });
  } catch (error) {
    console.error("POST /api/courses/[id]/reviews error:", error);
    return NextResponse.json(
      { error: "Erro ao salvar avaliação" },
      { status: 500 }
    );
  }
}
