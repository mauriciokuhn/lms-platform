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

    const [
      totalStudents,
      totalCourses,
      totalPublishedCourses,
      totalEnrollments,
      totalCompletedEnrollments,
      totalCertificates,
      recentEnrollments,
      recentStudents,
    ] = await Promise.all([
      db.user.count({ where: { role: "STUDENT" } }),
      db.course.count(),
      db.course.count({ where: { published: true } }),
      db.enrollment.count(),
      db.enrollment.count({ where: { status: "COMPLETED" } }),
      db.certificate.count(),
      db.enrollment.findMany({
        take: 5,
        orderBy: { enrolledAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          course: { select: { id: true, title: true } },
        },
      }),
      db.user.findMany({
        where: { role: "STUDENT" },
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      metrics: {
        totalStudents,
        totalCourses,
        totalPublishedCourses,
        totalEnrollments,
        totalCompletedEnrollments,
        totalCertificates,
        completionRate: totalEnrollments > 0
          ? Math.round((totalCompletedEnrollments / totalEnrollments) * 100)
          : 0,
      },
      recentEnrollments: recentEnrollments.map((e) => ({
        id: e.id,
        userName: e.user.name || e.user.email,
        courseTitle: e.course.title,
        enrolledAt: e.enrolledAt?.toISOString(),
      })),
      recentStudents: recentStudents.map((s) => ({
        id: s.id,
        name: s.name || s.email,
        email: s.email,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("GET /api/admin/metrics error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar métricas" }, { status: 500 });
  }
}
