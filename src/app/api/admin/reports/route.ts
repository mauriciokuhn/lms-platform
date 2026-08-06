import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const type = searchParams.get("type") || "courses";

    switch (type) {
      case "courses": {
        const courses = await db.course.findMany({
          include: {
            modules: { include: { lessons: { select: { id: true } } } },
            _count: { select: { enrollments: true } },
            reviews: { select: { rating: true } },
            instructor: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        const data = courses.map((c) => {
          const ratings = c.reviews.map((r) => r.rating);
          const avg = ratings.length > 0
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : 0;
          return {
            Título: c.title,
            Categoria: c.category || "—",
            Instrutor: c.instructor?.name || "—",
            Aulas: c.modules.reduce((acc, m) => acc + m.lessons.length, 0),
            Alunos: c._count.enrollments,
            "Avaliação Média": avg,
            Publicado: c.published ? "Sim" : "Não",
            "Criado em": c.createdAt.toISOString().split("T")[0],
          };
        });

        if (format === "csv") {
          const headers = Object.keys(data[0] || {});
          const csv = [
            headers.join(","),
            ...data.map((row) =>
              headers.map((h) => {
                const val = String((row as Record<string, unknown>)[h] ?? "");
                return val.includes(",") ? `"${val}"` : val;
              }).join(",")
            ),
          ].join("\n");

          return new NextResponse(csv, {
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="cursos-${new Date().toISOString().split("T")[0]}.csv"`,
            },
          });
        }

        return NextResponse.json(data);
      }

      case "students": {
        const students = await db.user.findMany({
          where: { role: "STUDENT" },
          include: {
            enrollments: {
              include: { course: { select: { title: true } } },
            },
            xp: { select: { xp: true, level: true } },
            _count: { select: { certificates: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        const data = students.map((s) => ({
          Nome: s.name || "—",
          Email: s.email,
          Cursos: s.enrollments.length,
          "Cursos Concluídos": s.enrollments.filter((e) => e.status === "COMPLETED").length,
          Certificados: s._count.certificates,
          XP: s.xp?.xp || 0,
          Nível: s.xp?.level || 1,
          "Cadastro": s.createdAt.toISOString().split("T")[0],
        }));

        if (format === "csv") {
          const headers = Object.keys(data[0] || {});
          const csv = [
            headers.join(","),
            ...data.map((row) =>
              headers.map((h) => {
                const val = String((row as Record<string, unknown>)[h] ?? "");
                return val.includes(",") ? `"${val}"` : val;
              }).join(",")
            ),
          ].join("\n");

          return new NextResponse(csv, {
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="alunos-${new Date().toISOString().split("T")[0]}.csv"`,
            },
          });
        }

        return NextResponse.json(data);
      }

      case "enrollments": {
        const enrollments = await db.enrollment.findMany({
          include: {
            user: { select: { name: true, email: true } },
            course: { select: { title: true } },
          },
          orderBy: { enrolledAt: "desc" },
        });

        const data = enrollments.map((e) => ({
          Aluno: e.user.name || e.user.email,
          Curso: e.course.title,
          Status: e.status === "COMPLETED" ? "Concluído" : e.status === "ACTIVE" ? "Ativo" : "Cancelado",
          "Matrícula": e.enrolledAt ? new Date(e.enrolledAt).toISOString().split("T")[0] : "—",
          "Conclusão": e.completedAt ? new Date(e.completedAt).toISOString().split("T")[0] : "—",
        }));

        if (format === "csv") {
          const headers = Object.keys(data[0] || {});
          const csv = [
            headers.join(","),
            ...data.map((row) =>
              headers.map((h) => {
                const val = String((row as Record<string, unknown>)[h] ?? "");
                return val.includes(",") ? `"${val}"` : val;
              }).join(",")
            ),
          ].join("\n");

          return new NextResponse(csv, {
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="matriculas-${new Date().toISOString().split("T")[0]}.csv"`,
            },
          });
        }

        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: "Tipo de relatório inválido" }, { status: 400 });
    }
  } catch (error) {
    logger.error("GET /api/admin/reports error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
