import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json({ error: "courseId é obrigatório" }, { status: 400 });
    }

    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({
      enrolled: !!enrollment,
      enrollment: enrollment || null,
    });
  } catch (error) {
    console.error("GET /api/enrollments/check error:", error);
    return NextResponse.json({ error: "Erro ao verificar matrícula" }, { status: 500 });
  }
}
