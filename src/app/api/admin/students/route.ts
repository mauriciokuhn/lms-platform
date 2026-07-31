import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const students = await db.user.findMany({
      where: { role: "STUDENT" },
      include: {
        enrollments: {
          include: {
            course: { select: { title: true } },
          },
        },
        certificates: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = students.map((student) => ({
      id: student.id,
      name: student.name || "—",
      email: student.email,
      image: student.image,
      coursesCount: student.enrollments.length,
      completedCount: student.enrollments.filter((e) => e.status === "COMPLETED").length,
      certificatesCount: student.certificates.length,
      lastAccess: student.enrollments.length > 0
        ? student.enrollments.sort((a, b) =>
            (b.enrolledAt?.getTime() || 0) - (a.enrolledAt?.getTime() || 0)
          )[0]?.enrolledAt?.toISOString()
        : null,
      createdAt: student.createdAt.toISOString(),
      enrollments: student.enrollments.map((e) => ({
        courseTitle: e.course.title,
        status: e.status,
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/admin/students error:", error);
    return NextResponse.json({ error: "Erro ao buscar alunos" }, { status: 500 });
  }
}
