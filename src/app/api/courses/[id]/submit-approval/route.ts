import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the course belongs to this instructor
    const course = await db.course.findUnique({ where: { id } });

    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    if (course.instructorId !== session.user.id) {
      return NextResponse.json({ error: "Este curso não pertence a você" }, { status: 403 });
    }

    if (course.approvalStatus === "pending") {
      return NextResponse.json({ error: "Este curso já está aguardando aprovação" }, { status: 400 });
    }

    if (course.approvalStatus === "approved") {
      return NextResponse.json({ error: "Este curso já foi aprovado" }, { status: 400 });
    }

    // Check if course has at least one module with lessons
    const moduleCount = await db.module.count({ where: { courseId: id } });
    if (moduleCount === 0) {
      return NextResponse.json({ error: "Adicione pelo menos um módulo antes de enviar para aprovação" }, { status: 400 });
    }

    const lessonCount = await db.lesson.count({
      where: { module: { courseId: id } },
    });
    if (lessonCount === 0) {
      return NextResponse.json({ error: "Adicione pelo menos uma aula antes de enviar para aprovação" }, { status: 400 });
    }

    // Update status to pending
    await db.course.update({
      where: { id },
      data: {
        approvalStatus: "pending",
        rejectionReason: null,
      },
    });

    // Notify all admins
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of admins) {
      await db.notification.create({
        data: {
          type: "ADMIN_ALERT",
          title: "Novo curso aguardando aprovação 📋",
          message: `"${course.title}" foi enviado por ${session.user.name || "um instrutor"} para revisão.`,
          link: `/admin/cursos/${id}/editar`,
          userId: admin.id,
        },
      });
    }

    await cache.invalidate("courses:list:*");

    return NextResponse.json({ success: true, message: "Curso enviado para aprovação!" });
  } catch (error) {
    console.error("POST submit-approval error:", error);
    return NextResponse.json({ error: "Erro ao enviar para aprovação" }, { status: 500 });
  }
}
