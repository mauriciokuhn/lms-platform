import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { action, rejectionReason } = await request.json();

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Ação inválida. Use 'approve' ou 'reject'" }, { status: 400 });
    }

    const course = await db.course.findUnique({
      where: { id },
      include: { instructor: { select: { id: true, name: true } } },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    if (course.approvalStatus !== "pending") {
      return NextResponse.json({ error: "Este curso não está aguardando aprovação" }, { status: 400 });
    }

    if (action === "approve") {
      await db.course.update({
        where: { id },
        data: {
          approvalStatus: "approved",
          published: true,
          rejectionReason: null,
        },
      });

      // Notify instructor
      if (course.instructorId) {
        await db.notification.create({
          data: {
            type: "COURSE_PUBLISHED",
            title: "Curso aprovado! ✅",
            message: `Seu curso "${course.title}" foi aprovado e já está disponível para os alunos.`,
            link: `/cursos/${course.id}`,
            userId: course.instructorId,
          },
        });
      }

      await cache.invalidate("courses:list:*");
    } else {
      if (!rejectionReason) {
        return NextResponse.json({ error: "Informe o motivo da rejeição" }, { status: 400 });
      }

      await db.course.update({
        where: { id },
        data: {
          approvalStatus: "rejected",
          rejectionReason,
          published: false,
        },
      });

      // Notify instructor
      if (course.instructorId) {
        await db.notification.create({
          data: {
            type: "ADMIN_ALERT",
            title: "Curso não aprovado ❌",
            message: `Seu curso "${course.title}" foi rejeitado. Motivo: ${rejectionReason}`,
            link: `/instrutor/cursos/${course.id}/editar`,
            userId: course.instructorId,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin/courses/[id]/approve error:", error);
    return NextResponse.json({ error: "Erro ao processar aprovação" }, { status: 500 });
  }
}
