import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      select: { id: true, featured: true, published: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    if (!course.published) {
      return NextResponse.json(
        { error: "Apenas cursos publicados podem ser destacados" },
        { status: 400 }
      );
    }

    const updated = await db.course.update({
      where: { id },
      data: { featured: !course.featured },
      select: { id: true, title: true, featured: true },
    });

    // Invalidate cache
    try {
      const { cache } = await import("@/lib/cache");
      await cache.invalidate("courses:list:*");
    } catch {}

    return NextResponse.json({
      message: updated.featured ? "Curso destacado com sucesso!" : "Destaque removido com sucesso!",
      course: updated,
    });
  } catch (error) {
    console.error("POST /api/admin/courses/[id]/featured error:", error);
    return NextResponse.json({ error: "Erro ao alternar destaque" }, { status: 500 });
  }
}
