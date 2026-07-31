import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    const [user, xp, streak, badges, certificates, enrollments, quizAttempts] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true, headline: true, bio: true, createdAt: true },
      }),
      db.userXP.findUnique({ where: { userId } }),
      db.userStreak.findUnique({ where: { userId } }),
      db.userBadge.findMany({ where: { userId }, orderBy: { earnedAt: "desc" } }),
      db.certificate.findMany({
        where: { userId },
        include: { course: { select: { title: true } } },
        orderBy: { issuedAt: "desc" },
      }),
      db.enrollment.findMany({
        where: { userId },
        include: { course: { select: { id: true, title: true } } },
      }),
      db.quizAttempt.findMany({
        where: { userId, passed: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const currentXP = xp?.xp || 0;
    const currentLevel = xp?.level || 1;
    const xpForNextLevel = currentLevel * 200;

    // Get actual lesson progress count
    const lessonProgressCount = await db.lessonProgress.count({
      where: { userId, completed: true },
    });

    const profile = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        headline: user.headline,
        bio: user.bio,
        createdAt: user.createdAt.toISOString(),
      },
      xp: {
        current: currentXP,
        level: currentLevel,
        nextLevelAt: xpForNextLevel,
      },
      streak: {
        current: streak?.currentStreak || 0,
        longest: streak?.longestStreak || 0,
      },
      badges: badges.map((b) => ({
        id: b.id,
        badge: b.badge,
        title: b.title,
        description: b.description,
        icon: b.icon,
        earnedAt: b.earnedAt.toISOString(),
      })),
      certificates: certificates.map((c) => ({
        id: c.id,
        courseTitle: c.course.title,
        issuedAt: c.issuedAt.toISOString(),
        code: c.certificateCode,
      })),
      stats: {
        coursesActive: enrollments.filter((e) => e.status === "ACTIVE").length,
        coursesCompleted: enrollments.filter((e) => e.status === "COMPLETED").length,
        lessonsCompleted: lessonProgressCount,
        quizzesPassed: quizAttempts.length,
      },
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Erro ao carregar perfil" }, { status: 500 });
  }
}
