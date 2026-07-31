import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "Título e descrição são obrigatórios" }, { status: 400 });
    }

    // Instructors always create courses as draft (pending admin approval)
    const course = await db.course.create({
      data: {
        title,
        description,
        category: category || null,
        published: false,
        approvalStatus: "draft",
        instructorId: session.user.id,
      },
    });

    await cache.invalidate("courses:list:*");

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error("POST /api/instructor/courses error:", error);
    return NextResponse.json({ error: "Erro ao criar curso" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const courses = await db.course.findMany({
      where: { instructorId: session.user.id },
      include: {
        modules: { include: { lessons: { select: { id: true } } } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formatted = courses.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      published: course.published,
      approvalStatus: course.approvalStatus || "draft",
      rejectionReason: course.rejectionReason,
      lessonsCount: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
      studentsCount: course._count.enrollments,
      createdAt: course.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("GET /api/instructor/courses error:", error);
    return NextResponse.json({ error: "Erro ao buscar cursos" }, { status: 500 });
  }
}
