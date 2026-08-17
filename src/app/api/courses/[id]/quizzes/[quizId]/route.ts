import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const session = await auth();

    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            options: true,
          },
        },
        // The quiz page shows the student's own attempt budget
        // ("usadas X de Y"). Guests get `questions` instead — Prisma
        // rejects an empty _count select.
        _count: {
          select: {
            ...(session?.user
              ? { attempts: { where: { userId: session.user.id } } }
              : { questions: true }),
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz não encontrado" }, { status: 404 });
    }

    return NextResponse.json(quiz);
  } catch (error) {
    logger.error("GET /api/courses/[id]/quizzes/[quizId] error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar quiz" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { quizId } = await params;
    const body = await request.json();
    const { title, description, passingScore, maxAttempts } = body;

    const quiz = await db.quiz.update({
      where: { id: quizId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(passingScore !== undefined && { passingScore }),
        ...(maxAttempts !== undefined && { maxAttempts }),
      },
    });

    return NextResponse.json(quiz);
  } catch (error) {
    logger.error("PUT /api/courses/[id]/quizzes/[quizId] error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao atualizar quiz" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { quizId } = await params;
    await db.quiz.delete({ where: { id: quizId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/courses/[id]/quizzes/[quizId] error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao excluir quiz" }, { status: 500 });
  }
}
