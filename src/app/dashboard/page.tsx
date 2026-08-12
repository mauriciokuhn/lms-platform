"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useGamificationContext } from "@/lib/contexts/gamification-context";
import { XPBar, StreakDisplay, GamificationWidget } from "@/components/ui/gamification-display";
import { useResumeCourse } from "@/lib/hooks/use-resume-course";
import { ResumeCourseButton } from "@/components/ui/resume-course-button";
import { toast } from "sonner";

interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  course: {
    id: string;
    title: string;
    category: string | null;
    thumbnailUrl: string | null;
  };
  progress: { total: number; completed: number; percentage: number };
}

function RecommendationsSection() {
  const [recommendations, setRecommendations] = useState<{
    id: string; title: string; description: string; category: string | null;
    studentsCount: number; modulesCount: number; score: number; reason: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((data) => setRecommendations(data.recommendations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || recommendations.length === 0) return null;

  const categoryIcons: Record<string, string> = {
    "Programação": "💻", "Front-end": "🎨", "Back-end": "⚙️",
    "Data Science": "📊", "Design": "🖌️", "Banco de Dados": "🗄️",
  };

  return (
    <section className="mb-8">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Recomendados para Você</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((course) => (
          <Link
            key={course.id}
            href={`/cursos/${course.id}`}
            className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
              <span className="text-3xl">{categoryIcons[course.category || ""] || "📚"}</span>
            </div>
            {course.category && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {course.category}
              </span>
            )}
            <h4 className="mt-2 font-semibold text-zinc-900 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
              {course.title}
            </h4>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
              {course.description}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
              <span>{course.studentsCount} alunos</span>
              <span>{course.modulesCount} módulos</span>
            </div>
            <div className="mt-2 rounded-lg bg-zinc-50 px-2 py-1 text-center text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {course.reason}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { progress: gamification, loading: gamificationLoading, refresh: refreshGamification } = useGamificationContext();
  const { resumeCourse, continueLoading } = useResumeCourse();

  // `silent` skips the welcome toast — used by the SSE real-time refreshes.
  const loadData = useCallback(async (silent = false) => {
    try {
      const [enrollRes, certRes] = await Promise.all([
        fetch("/api/enrollments"),
        fetch("/api/certificates"),
      ]);
      if (enrollRes.ok) {
        const enrollData = await enrollRes.json();
        setEnrollments(enrollData);
        if (!silent && enrollData.length > 0 && enrollData[0].enrolledAt) {
          toast.success("Dashboard atualizado!", { description: "Seus cursos foram carregados." });
        }
      }
      if (certRes.ok) {
        const certData = await certRes.json();
        setCertificatesCount(certData.length);
      }
    } catch (err) {
      console.error(err);
      if (!silent) toast.error("Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "loading") return;
    loadData();
  }, [status, router, loadData]);

  // Real-time progress: refresh enrollments when a lesson is completed
  // anywhere (SSE "LESSON_COMPLETED" event broadcast by the server).
  useEffect(() => {
    if (!session?.user) return;
    const es = new EventSource("/api/events/subscribe");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "notification" && event.payload?.type === "LESSON_COMPLETED") {
          loadData(true);
          refreshGamification();
        }
      } catch {
        // silent
      }
    };
    es.onerror = () => {};
    return () => es.close();
  }, [session, loadData, refreshGamification]);

  if (!session?.user) return null;

  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE");
  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED");
  const totalCompletedLessons = enrollments.reduce((acc, e) => acc + e.progress.completed, 0);
  const totalLessons = enrollments.reduce((acc, e) => acc + e.progress.total, 0);
  const overallPercentage = totalLessons > 0 ? Math.round((totalCompletedLessons / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Meu Dashboard</h1>
          {/* Desktop nav */}
          <div className="hidden items-center gap-1 sm:flex">
            <Link href="/meus-cursos" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Meus Cursos</Link>
            <Link href="/certificados" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Certificados</Link>
            <GamificationWidget />
            <Link href="/perfil" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">👤 Perfil</Link>
            <Link href="/gamificacao" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">🏆</Link>
            <div className="ml-1 flex items-center gap-3">
              <NotificationBell />
              <ThemeToggle />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{session.user.name || session.user.email}</span>
              <LogoutButton />
            </div>
          </div>
          {/* Mobile nav */}
          <div className="flex items-center gap-2 sm:hidden">
            <Link href="/meus-cursos" className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Cursos</Link>
            <Link href="/certificados" className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Cert.</Link>
            <GamificationWidget />
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Olá, {session.user.name || "Aluno"}!</h2>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">Continue seus estudos de onde parou.</p>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Cursos Ativos", value: activeEnrollments.length },
                { label: "Concluídos", value: completedEnrollments.length },
                { label: "Aulas Completas", value: totalCompletedLessons },
                { label: "Certificados", value: certificatesCount },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {enrollments.length > 0 && (
              <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Progresso Geral</h3>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overallPercentage}%</span>
                </div>
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-zinc-700 to-zinc-900 transition-all duration-500 dark:from-zinc-500 dark:to-zinc-300" style={{ width: `${overallPercentage}%` }} />
                </div>
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">{totalCompletedLessons} de {totalLessons} aulas concluídas</p>
              </div>
            )}

            {activeEnrollments.length > 0 && (
              <section className="mb-8">
                <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Em Andamento</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeEnrollments.map((enrollment) => (
                    <Link key={enrollment.id} href={`/cursos/${enrollment.course.id}`}
                      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900">
                      <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
                        <svg className="h-8 w-8 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      {enrollment.course.category && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{enrollment.course.category}</span>
                      )}
                      <h4 className="mt-2 font-semibold text-zinc-900 dark:text-white">{enrollment.course.title}</h4>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                          <span>Progresso</span>
                          <span>{enrollment.progress.percentage}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                          <div className="h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-300" style={{ width: `${enrollment.progress.percentage}%` }} />
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{enrollment.progress.completed}/{enrollment.progress.total} aulas</p>
                      <ResumeCourseButton
                        courseId={enrollment.course.id}
                        loading={continueLoading === enrollment.course.id}
                        onResume={resumeCourse}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Gamificação Summary */}
            {gamification && !gamificationLoading && (
              <section className="mb-8 grid gap-4 sm:grid-cols-2">
                <XPBar xp={gamification.xp} />
                <StreakDisplay streak={gamification.streak} />
              </section>
            )}

            {enrollments.length === 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                    <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Nenhum curso ainda</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Matricule-se em um curso para começar.</p>
                <Link href="/cursos" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600">
                  Explorar Cursos
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            )}

            {enrollments.length > 0 && !loading && <RecommendationsSection />}

            {enrollments.length > 0 && (
              <div className="text-center">
                <Link href="/cursos" className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600">
                  Explorar Cursos <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
