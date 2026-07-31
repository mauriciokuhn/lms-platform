import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { lessonId } = await params;
    const body = await request.json();
    const { title, description, contentType, contentUrl, contentBody, duration, orderIndex } = body;

    const lesson = await db.lesson.update({
      where: { id: lessonId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(contentType !== undefined && { contentType }),
        ...(contentUrl !== undefined && { contentUrl }),
        ...(contentBody !== undefined && { contentBody }),
        ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
        ...(orderIndex !== undefined && { orderIndex }),
      },
    });

    return NextResponse.json(lesson);
  } catch (error) {
    console.error("PUT /api/courses/[id]/modules/[moduleId]/lessons/[lessonId] error:", error);
    return NextResponse.json({ error: "Erro ao atualizar aula" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { lessonId } = await params;
    await db.lesson.delete({ where: { id: lessonId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/courses/[id]/modules/[moduleId]/lessons/[lessonId] error:", error);
    return NextResponse.json({ error: "Erro ao excluir aula" }, { status: 500 });
  }
}
