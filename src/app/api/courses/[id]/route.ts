import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    const course = await db.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
              include: {
                // Only the requesting user's own progress — the "Seu
                // progresso" widgets on the course/lesson pages rely on it.
                // Returning all users' progress made every visitor appear at
                // 100% on any course someone else had completed.
                ...(session?.user
                  ? { progress: { where: { userId: session.user.id } } }
                  : {}),
              },
            },
          },
        },
        quizzes: {
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
              include: {
                options: true,
              },
            },
            // "N tentativa(s)" on the course page is the student's own
            // attempt budget — count only this user's attempts (guests get
            // none, matching the locked quizzes they see). Prisma rejects an
            // empty _count select, so guests get `questions` instead (the
            // page reads `attempts ?? 0`).
            _count: {
              select: {
                ...(session?.user
                  ? { attempts: { where: { userId: session.user.id } } }
                  : { questions: true }),
              },
            },
          },
        },
        instructor: {
          select: { id: true, name: true, headline: true, image: true, bio: true },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    logger.error("GET /api/courses/[id] error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar curso" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Only ADMIN can fully edit; INSTRUCTOR can edit their own courses (limited fields)
    if (session.user.role !== "ADMIN") {
      // Check if instructor owns this course
      const existing = await db.course.findUnique({
        where: { id },
        select: { instructorId: true },
      });
      if (!existing || existing.instructorId !== session.user.id) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { title, description, category, price, published, thumbnailUrl, instructorId } = body;

    const course = await db.course.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(price !== undefined && { price: price ? parseFloat(price) : null }),
        ...(published !== undefined && { published }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(instructorId !== undefined && { instructorId: instructorId || null }),
      },
    });

    return NextResponse.json(course);
  } catch (error) {
    logger.error("PUT /api/courses/[id] error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao atualizar curso" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    await db.course.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/courses/[id] error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao excluir curso" }, { status: 500 });
  }
}
