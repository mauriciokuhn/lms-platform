import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(
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
    const { title, description, orderIndex } = body;

    const module = await db.module.update({
      where: { id: moduleId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(orderIndex !== undefined && { orderIndex }),
      },
    });

    return NextResponse.json(module);
  } catch (error) {
    console.error("PUT /api/courses/[id]/modules/[moduleId] error:", error);
    return NextResponse.json({ error: "Erro ao atualizar módulo" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { moduleId } = await params;
    await db.module.delete({ where: { id: moduleId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/courses/[id]/modules/[moduleId] error:", error);
    return NextResponse.json({ error: "Erro ao excluir módulo" }, { status: 500 });
  }
}
