import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const modules = await db.module.findMany({
      where: { courseId },
      orderBy: { orderIndex: "asc" },
      include: {
        lessons: {
          orderBy: { orderIndex: "asc" },
        },
        _count: { select: { lessons: true } },
      },
    });

    return NextResponse.json(modules);
  } catch (error) {
    logger.error("GET /api/courses/[id]/modules error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar módulos" }, { status: 500 });
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
    const { title, description, orderIndex } = body;

    if (!title) {
      return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
    }

    // Get the next order index if not provided
    let nextIndex = orderIndex;
    if (!nextIndex) {
      const lastModule = await db.module.findFirst({
        where: { courseId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });
      nextIndex = (lastModule?.orderIndex ?? 0) + 1;
    }

    const newModule = await db.module.create({
      data: {
        title,
        description: description || null,
        orderIndex: nextIndex,
        courseId,
      },
    });

    return NextResponse.json(newModule, { status: 201 });
  } catch (error) {
    logger.error("POST /api/courses/[id]/modules error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao criar módulo" }, { status: 500 });
  }
}
