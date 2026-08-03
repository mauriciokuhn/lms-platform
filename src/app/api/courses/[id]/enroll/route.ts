import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { blockDemoUser } from "@/lib/demo-mode";
import { notifyUser } from "@/lib/event-bus";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Block demo users from enrolling
    const demoBlocked = await blockDemoUser();
    if (demoBlocked) return demoBlocked;

    const { id: courseId } = await params;

    // Verify the course exists (avoid a raw FK failure -> 500)
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    // Check if already enrolled
    const existing = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Você já está matriculado neste curso" }, { status: 409 });
    }

    const enrollment = await db.enrollment.create({
      data: {
        userId: session.user.id,
        courseId,
        status: "ACTIVE",
        enrolledAt: new Date(),
      },
      include: {
        course: { select: { title: true } },
      },
    });

    // 🔔 Notify: enrollment confirmed
    await notifyUser(session.user.id, {
      type: "ENROLLMENT_CONFIRMED",
      title: "Matrícula confirmada! 📚",
      message: `Você se matriculou em "${course.title}". Bons estudos!`,
      link: `/cursos/${courseId}`,
    });

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    console.error("POST /api/courses/[id]/enroll error:", error);
    return NextResponse.json({ error: "Erro ao realizar matrícula" }, { status: 500 });
  }
}
