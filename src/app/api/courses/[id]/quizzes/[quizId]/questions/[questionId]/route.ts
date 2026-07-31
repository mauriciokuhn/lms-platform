import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; quizId: string; questionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { questionId } = await params;

    // Check if this is the last question
    const question = await db.question.findUnique({
      where: { id: questionId },
      select: { quizId: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });
    }

    const questionCount = await db.question.count({
      where: { quizId: question.quizId },
    });

    if (questionCount <= 1) {
      return NextResponse.json(
        { error: "O quiz precisa de pelo menos uma questão. Exclua o quiz inteiro se necessário." },
        { status: 400 }
      );
    }

    await db.question.delete({ where: { id: questionId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/courses/[id]/quizzes/[quizId]/questions/[questionId] error:", error);
    return NextResponse.json({ error: "Erro ao excluir questão" }, { status: 500 });
  }
}
