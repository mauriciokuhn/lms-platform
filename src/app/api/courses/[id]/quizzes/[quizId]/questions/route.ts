import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST(
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
    const { text, orderIndex } = body;
    const options = body.options as { text: string; isCorrect?: boolean }[];

    if (!text || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: "Pergunta deve ter texto e pelo menos 2 opções" }, { status: 400 });
    }

    // Get next order index
    let nextIndex = orderIndex;
    if (!nextIndex) {
      const lastQuestion = await db.question.findFirst({
        where: { quizId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });
      nextIndex = (lastQuestion?.orderIndex ?? 0) + 1;
    }

    const question = await db.question.create({
      data: {
        text,
        orderIndex: nextIndex,
        quizId,
        options: {
          create: options.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect || false,
          })),
        },
      },
      include: { options: true },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    logger.error("POST /api/courses/[id]/quizzes/[quizId]/questions error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao adicionar questão" }, { status: 500 });
  }
}
