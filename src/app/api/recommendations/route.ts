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

    // Get user's enrollments and completed courses
    const enrollments = await db.enrollment.findMany({
      where: { userId },
      include: {
        course: { select: { id: true, category: true, title: true } },
      },
    });

    const enrolledCourseIds = new Set(enrollments.map((e) => e.course.id));
    const completedCategories = enrollments
      .filter((e) => e.status === "COMPLETED" || e.status === "ACTIVE")
      .map((e) => e.course.category)
      .filter(Boolean) as string[];

    // Get user's badges to understand interests
    const badges = await db.userBadge.findMany({
      where: { userId },
    });
    const hasBadges = badges.length > 0;

    // Get user's XP/level for engagement level
    const userXP = await db.userXP.findUnique({ where: { userId } });
    const engagementLevel = userXP?.level || 1;

    // Get courses the user hasn't enrolled in
    const availableCourses = await db.course.findMany({
      where: {
        published: true,
        id: { notIn: Array.from(enrolledCourseIds) },
      },
      include: {
        _count: { select: { enrollments: true, modules: true } },
        modules: {
          include: { _count: { select: { lessons: true } } },
        },
      },
    });

    // Score each available course
    const scored = availableCourses.map((course) => {
      let score = 0;

      // Factor 1: Category matching (weight: 40)
      if (course.category && completedCategories.includes(course.category)) {
        score += 40;
      }

      // Factor 2: Popularity (weight: 30)
      const maxEnrollments = Math.max(
        ...availableCourses.map((c) => c._count.enrollments),
        1
      );
      score += (course._count.enrollments / maxEnrollments) * 30;

      // Factor 3: Content richness (weight: 20)
      const totalLessons = course.modules.reduce(
        (acc, m) => acc + m._count.lessons,
        0
      );
      const maxLessons = Math.max(
        ...availableCourses.map((c) =>
          c.modules.reduce((acc, m) => acc + m._count.lessons, 0)
        ),
        1
      );
      score += (totalLessons / maxLessons) * 20;

      // Factor 4: New user bonus (weight: 10)
      if (!hasBadges) {
        score += 10;
      }

      // Factor 5: Engagement level matching
      // Beginner (level 1-2) gets intro courses boosted
      const lessonCount = course.modules.reduce(
        (acc, m) => acc + m._count.lessons,
        0
      );
      if (engagementLevel <= 2 && lessonCount <= 8) {
        score += 10; // Recommend shorter courses for beginners
      }
      if (engagementLevel >= 3 && lessonCount > 8) {
        score += 10; // Recommend longer courses for advanced users
      }

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        category: course.category,
        thumbnailUrl: course.thumbnailUrl,
        studentsCount: course._count.enrollments,
        modulesCount: course._count.modules,
        score: Math.round(score),
        reason: getRecommendationReason(course.category, completedCategories, hasBadges, score),
      };
    });

    // Sort by score (descending), clean up response, and return top 6
    const recommendations = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ score, reason, id, title, description, category, thumbnailUrl, studentsCount, modulesCount }) => ({
        id, title, description, category, thumbnailUrl,
        studentsCount, modulesCount, score, reason,
      }));

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Recommendations error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar recomendações" },
      { status: 500 }
    );
  }
}

function getRecommendationReason(
  category: string | null,
  completedCategories: string[],
  hasBadges: boolean,
  score: number
): string {
  if (score >= 70 && category && completedCategories.includes(category)) {
    return `Baseado no seu interesse em ${category}`;
  }
  if (score >= 50) {
    return "Curso mais popular entre alunos";
  }
  if (!hasBadges) {
    return "Recomendado para começar";
  }
  return "Continue explorando novos temas";
}
