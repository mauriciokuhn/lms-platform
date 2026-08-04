import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const quizzes = await db.quiz.findMany({
      where: { courseId },
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(quizzes);
  } catch (error) {
    console.error("GET /api/courses/[id]/quizzes error:", error);
    return NextResponse.json({ error: "Erro ao buscar quizzes" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: courseId } = await params;
    const body = await request.json();
    const { title, description, passingScore, maxAttempts, questions } = body;

    if (!title) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
    }

    const quiz = await db.quiz.create({
      data: {
        title,
        description: description || null,
        passingScore: passingScore || 70,
        maxAttempts: maxAttempts || 3,
        courseId,
        ...(questions && {
          questions: {
            create: questions.map((q: any, qi: number) => ({
              text: q.text,
              orderIndex: qi + 1,
              options: {
                create: q.options.map((o: any, oi: number) => ({
                  text: o.text,
                  isCorrect: o.isCorrect || false,
                })),
              },
            })),
          },
        }),
      },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });

    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses/[id]/quizzes error:", error);
    return NextResponse.json({ error: "Erro ao criar quiz" }, { status: 500 });
  }
}
