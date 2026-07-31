import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { blockDemoUser } from "@/lib/demo-mode";
import { notifyUser } from "@/lib/event-bus";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Block demo users from generating certificates
    const demoBlocked = await blockDemoUser();
    if (demoBlocked) return demoBlocked;

    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json({ error: "ID do curso é obrigatório" }, { status: 400 });
    }

    // Check if certificate already exists
    const existing = await db.certificate.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    // Verify course completion
    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: { select: { id: true } },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    // Check all lessons completed
    const allLessonIds = course.modules.flatMap((m) =>
      m.lessons.map((l) => l.id)
    );
    const completedLessons = await db.lessonProgress.count({
      where: {
        userId: session.user.id,
        lessonId: { in: allLessonIds },
        completed: true,
      },
    });

    if (allLessonIds.length > 0 && completedLessons < allLessonIds.length) {
      return NextResponse.json(
        {
          error: "Complete todas as aulas do curso para gerar o certificado",
          progress: `${completedLessons}/${allLessonIds.length}`,
        },
        { status: 400 }
      );
    }

    // Check quiz passed
    const courseQuiz = await db.quiz.findFirst({
      where: { courseId },
      include: {
        attempts: {
          where: { userId: session.user.id, passed: true },
          take: 1,
        },
      },
    });

    if (courseQuiz && courseQuiz.attempts.length === 0) {
      return NextResponse.json(
        { error: "Você precisa ser aprovado no questionário final para obter o certificado" },
        { status: 400 }
      );
    }

    // Generate certificate with unique code
    const code = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const certificate = await db.certificate.create({
      data: {
        userId: session.user.id,
        courseId,
        certificateCode: code,
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    // 🔔 Notify: certificate issued
    await notifyUser(session.user.id, {
      type: "CERTIFICATE_ISSUED",
      title: "Certificado emitido! 🎓",
      message: `Parabéns! Seu certificado de "${certificate.course.title}" está disponível.`,
      link: `/certificados`,
    });

    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    console.error("POST /api/certificates/generate error:", error);
    return NextResponse.json({ error: "Erro ao gerar certificado" }, { status: 500 });
  }
}
