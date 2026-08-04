import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const [instructorMetrics, pendingCourses, recentSubmissions] = await Promise.all([
      // Per-instructor stats
      db.user.findMany({
        where: { role: "INSTRUCTOR" },
        select: {
          id: true,
          name: true,
          email: true,
          headline: true,
          createdAt: true,
          _count: { select: { courses: true } },
          courses: {
            select: {
              id: true,
              title: true,
              published: true,
              approvalStatus: true,
              _count: { select: { enrollments: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Pending approval count
      db.course.count({
        where: { approvalStatus: "pending" },
      }),
      // Recent submissions (last 10)
      db.course.findMany({
        where: { approvalStatus: { not: "draft" } },
        include: {
          instructor: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);

    const formatted = instructorMetrics.map((inst) => {
      const totalCourses = inst._count.courses;
      const publishedCount = inst.courses.filter((c) => c.approvalStatus === "approved").length;
      const pendingCount = inst.courses.filter((c) => c.approvalStatus === "pending").length;
      const totalStudents = inst.courses.reduce((acc, c) => acc + c._count.enrollments, 0);

      return {
        id: inst.id,
        name: inst.name || "Sem nome",
        email: inst.email,
        headline: inst.headline,
        createdAt: inst.createdAt.toISOString(),
        totalCourses,
        publishedCount,
        pendingCount,
        totalStudents,
      };
    });

    return NextResponse.json({
      instructors: formatted,
      totalInstructors: formatted.length,
      pendingCourses,
      recentSubmissions: recentSubmissions.map((s) => ({
        id: s.id,
        title: s.title,
        approvalStatus: s.approvalStatus,
        instructorName: s.instructor?.name || "Desconhecido",
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("GET /api/admin/courses/[id]/instructor-metrics error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar métricas" }, { status: 500 });
  }
}
