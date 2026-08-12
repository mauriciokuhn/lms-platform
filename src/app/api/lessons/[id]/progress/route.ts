import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { blockDemoUser } from "@/lib/demo-mode";
import { notifyUser, notifyAdmins } from "@/lib/event-bus";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id: lessonId } = await params;

    const progress = await db.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId,
        },
      },
    });

    return NextResponse.json(progress || { completed: false, watchedSeconds: 0 });
  } catch (error) {
    logger.error("GET /api/lessons/[id]/progress error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar progresso" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Block demo users from saving progress
    const demoBlocked = await blockDemoUser();
    if (demoBlocked) return demoBlocked;

    const { id: lessonId } = await params;
    const body = await request.json();
    const { watchedSeconds, completed } = body;

    const existing = await db.lessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId,
        },
      },
    });

    let progress;
    if (existing) {
      progress = await db.lessonProgress.update({
        where: { id: existing.id },
        data: {
          watchedSeconds: watchedSeconds ?? existing.watchedSeconds,
          completed: completed ?? existing.completed,
          lastAccessedAt: new Date(),
          ...(completed && { completedAt: new Date() }),
        },
      });
    } else {
      progress = await db.lessonProgress.create({
        data: {
          userId: session.user.id,
          lessonId,
          watchedSeconds: watchedSeconds || 0,
          completed: completed || false,
          lastAccessedAt: new Date(),
          ...(completed && { completedAt: new Date() }),
        },
      });
    }

    // 🎮 Gamification: award XP for completing a lesson
    if (completed && !existing?.completed) {
      await db.userXP.upsert({
        where: { userId: session.user.id },
        update: { xp: { increment: 50 } },
        create: { userId: session.user.id, xp: 50, level: 1 },
      });

      // Update level based on XP
      const xpRecord = await db.userXP.findUnique({ where: { userId: session.user.id } });
      if (xpRecord) {
        const newLevel = Math.floor(xpRecord.xp / 200) + 1;
        if (newLevel > (xpRecord.level || 1)) {
          await db.userXP.update({
            where: { userId: session.user.id },
            data: { level: newLevel },
          });
          await db.achievement.create({
            data: {
              userId: session.user.id,
              type: "LEVEL_UP",
              title: `Subiu para o nível ${newLevel}!`,
              description: `Parabéns! Você alcançou o nível ${newLevel}.`,
              xpGained: 0,
            },
          });
        }
      }

      // Check for FIRST_LESSON badge
      const existingBadge = await db.userBadge.findUnique({
        where: { userId_badge: { userId: session.user.id, badge: "FIRST_LESSON" } },
      });
      if (!existingBadge) {
        await db.userBadge.create({
          data: {
            userId: session.user.id,
            badge: "FIRST_LESSON",
            title: "Primeira Aula",
            description: "Completou a primeira aula",
          },
        });
        await db.achievement.create({
          data: {
            userId: session.user.id,
            type: "BADGE",
            title: "Badge: Primeira Aula! 🎯",
            description: "Você completou sua primeira aula.",
            xpGained: 25,
          },
        });
        await db.userXP.upsert({
          where: { userId: session.user.id },
          update: { xp: { increment: 25 } },
          create: { userId: session.user.id, xp: 25, level: 1 },
        });
      }

      // 🔔 Notify: lesson completed
      const lessonInfo = await db.lesson.findUnique({
        where: { id: lessonId },
        select: { title: true, module: { select: { course: { select: { id: true, title: true } } } } },
      });

      if (lessonInfo) {
        // Notify the student
        await notifyUser(session.user.id, {
          type: "LESSON_COMPLETED",
          title: "Aula concluída! 🎉",
          message: `Você concluiu "${lessonInfo.title}". Continue assim!`,
          link: `/cursos/${lessonInfo.module.course.id}/aulas/${lessonId}`,
        });

        // Notify admins
        const userInfo = await db.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, email: true },
        });
        await notifyAdmins({
          type: "LESSON_COMPLETED",
          title: "Aluno concluiu aula",
          message: `${userInfo?.name || userInfo?.email || "Aluno"} concluiu "${lessonInfo.title}" em "${lessonInfo.module.course.title}".`,
          link: `/admin/alunos`,
        });
      }

      // Update streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const streak = await db.userStreak.findUnique({ where: { userId: session.user.id } });
      if (streak) {
        const lastActivity = streak.lastActivityAt ? new Date(streak.lastActivityAt) : null;
        if (lastActivity) {
          const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            const newStreak = streak.currentStreak + 1;
            await db.userStreak.update({
              where: { userId: session.user.id },
              data: {
                currentStreak: newStreak,
                longestStreak: Math.max(newStreak, streak.longestStreak),
                lastActivityAt: today,
              },
            });

            // Award streak milestone badges
            if (newStreak === 3) {
              const sb = await db.userBadge.findUnique({ where: { userId_badge: { userId: session.user.id, badge: "STREAK_3" } } });
              if (!sb) {
                await db.userBadge.create({ data: { userId: session.user.id, badge: "STREAK_3", title: "Streak de 3 Dias 🔥", description: "Manteve streak por 3 dias consecutivos" } });
                await db.achievement.create({ data: { userId: session.user.id, type: "BADGE", title: "Badge: Streak de 3 Dias! 🔥", description: "3 dias consecutivos de estudos!", xpGained: 30 } });
              }
            }
            if (newStreak === 7) {
              const sb = await db.userBadge.findUnique({ where: { userId_badge: { userId: session.user.id, badge: "STREAK_7" } } });
              if (!sb) {
                await db.userBadge.create({ data: { userId: session.user.id, badge: "STREAK_7", title: "Streak de 7 Dias 🔥", description: "Manteve streak por 7 dias consecutivos" } });
                await db.achievement.create({ data: { userId: session.user.id, type: "BADGE", title: "Badge: Streak de 7 Dias! 🔥", description: "Uma semana inteira de estudos!", xpGained: 50 } });
              }
            }
            if (newStreak === 30) {
              const sb = await db.userBadge.findUnique({ where: { userId_badge: { userId: session.user.id, badge: "STREAK_30" } } });
              if (!sb) {
                await db.userBadge.create({ data: { userId: session.user.id, badge: "STREAK_30", title: "Streak de 30 Dias 🔥", description: "Manteve streak por 30 dias consecutivos! Incrível!" } });
                await db.achievement.create({ data: { userId: session.user.id, type: "BADGE", title: "Badge: Streak de 30 Dias! 🔥", description: "Um mês inteiro de estudos!", xpGained: 100 } });
              }
            }
          } else if (diffDays > 1) {
            await db.userStreak.update({
              where: { userId: session.user.id },
              data: { currentStreak: 1, lastActivityAt: today },
            });
          }
        } else {
          await db.userStreak.update({
            where: { userId: session.user.id },
            data: { currentStreak: 1, lastActivityAt: today },
          });
        }
      } else {
        await db.userStreak.create({
          data: { userId: session.user.id, currentStreak: 1, longestStreak: 1, lastActivityAt: today },
        });
      }
    }

    // Check if all lessons in the course are completed → mark enrollment completed
    if (completed) {
      const lesson = await db.lesson.findUnique({
        where: { id: lessonId },
        include: {
          module: {
            include: {
              course: {
                include: {
                  modules: {
                    include: {
                      lessons: { select: { id: true } },
                    },
                  },
                  instructor: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      });

      if (lesson) {
        const course = lesson.module.course;
        const allLessonIds = course.modules.flatMap((m) =>
          m.lessons.map((l) => l.id)
        );
        const completedCount = await db.lessonProgress.count({
          where: {
            userId: session.user.id,
            lessonId: { in: allLessonIds },
            completed: true,
          },
        });

        if (completedCount === allLessonIds.length && allLessonIds.length > 0) {
          await db.enrollment.updateMany({
            where: {
              userId: session.user.id,
              courseId: course.id,
            },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
            },
          });

          // 🎓 Notify the course instructor that a student finished the course
          if (course.instructor) {
            const student = await db.user.findUnique({
              where: { id: session.user.id },
              select: { name: true, email: true },
            });
            await notifyUser(course.instructor.id, {
              type: "ACHIEVEMENT_EARNED",
              title: "Aluno concluiu o curso! 🎓",
              message: `${student?.name || student?.email || "Um aluno"} concluiu 100% de "${course.title}".`,
              link: `/instrutor/cursos/${course.id}`,
            });
          }
        }
      }
    }

    return NextResponse.json(progress);
  } catch (error) {
    logger.error("POST /api/lessons/[id]/progress error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao salvar progresso" }, { status: 500 });
  }
}
