import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { moduleId } = await params;

    const lessons = await db.lesson.findMany({
      where: { moduleId },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json(lessons);
  } catch (error) {
    console.error("GET /api/courses/[id]/modules/[moduleId]/lessons error:", error);
    return NextResponse.json({ error: "Erro ao buscar aulas" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { moduleId } = await params;
    const body = await request.json();
    const { title, description, contentType, contentUrl, contentBody, duration, orderIndex } = body;

    if (!title || !contentType) {
      return NextResponse.json({ error: "Título e tipo de conteúdo são obrigatórios" }, { status: 400 });
    }

    let nextIndex = orderIndex;
    if (!nextIndex) {
      const lastLesson = await db.lesson.findFirst({
        where: { moduleId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });
      nextIndex = (lastLesson?.orderIndex ?? 0) + 1;
    }

    const lesson = await db.lesson.create({
      data: {
        title,
        description: description || null,
        contentType,
        contentUrl: contentUrl || null,
        contentBody: contentBody || null,
        duration: duration ? parseInt(duration) : null,
        orderIndex: nextIndex,
        moduleId,
      },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses/[id]/modules/[moduleId]/lessons error:", error);
    return NextResponse.json({ error: "Erro ao criar aula" }, { status: 500 });
  }
}
