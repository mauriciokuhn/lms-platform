"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GamificationWidget } from "@/components/ui/gamification-display";
import { useResumeCourse } from "@/lib/hooks/use-resume-course";
import { ResumeCourseButton } from "@/components/ui/resume-course-button";

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
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
}

export default function MyCoursesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "progress" | "title">("recent");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const { resumeCourse, continueLoading } = useResumeCourse();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "loading") return;

    async function loadData() {
      try {
        const res = await fetch("/api/enrollments");
        if (res.ok) {
          const data = await res.json();
          setEnrollments(data);
        }
      } catch (err) {
        console.error("Error loading enrollments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session, router, status]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xl font-bold text-zinc-900 dark:text-white">
              Ponto do Saber
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <GamificationWidget />
            <Link
              href="/cursos"
              className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Explorar Cursos
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">Meus Cursos</h1>
        <p className="mb-4 text-zinc-500 dark:text-zinc-400">Acompanhe o progresso dos seus cursos</p>

        {/* Filters */}
        {!loading && enrollments.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nos meus cursos..."
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="active">Em andamento</option>
              <option value="completed">Concluídos</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="recent">Mais recentes</option>
              <option value="progress">Maior progresso</option>
              <option value="title">Ordem alfabética</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white" />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Nenhum curso ainda</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Matricule-se em um curso para começar sua jornada de aprendizado.
            </p>
            <Link
              href="/cursos"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Explorar Cursos
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments
              .filter((e) => {
                const q = search.toLowerCase();
                const matchesSearch = !q || e.course.title.toLowerCase().includes(q) || (e.course.category || "").toLowerCase().includes(q);
                const matchesStatus = filterStatus === "all" || (filterStatus === "active" ? e.status === "ACTIVE" : e.status === "COMPLETED");
                return matchesSearch && matchesStatus;
              })
              .sort((a, b) => {
                if (sortBy === "progress") return b.progress.percentage - a.progress.percentage;
                if (sortBy === "title") return a.course.title.localeCompare(b.course.title);
                return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime();
              })
              .map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/cursos/${enrollment.course.id}`}
                className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:shadow-md dark:hover:border-zinc-700"
              >
                <div className="mb-4 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 dark:from-zinc-800 to-zinc-200 dark:to-zinc-700">
                  {enrollment.status === "COMPLETED" ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                      <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  ) : (
                    <svg className="h-8 w-8 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                <span className="inline-block rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  {enrollment.course.category || "Curso"}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                  {enrollment.course.title}
                </h3>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Progresso</span>
                    <span>{enrollment.progress.percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        enrollment.progress.percentage === 100
                          ? "bg-green-500"
                          : "bg-zinc-900 dark:bg-zinc-100"
                      }`}
                      style={{ width: `${enrollment.progress.percentage}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {enrollment.status === "COMPLETED"
                      ? "✅ Concluído"
                      : `${enrollment.progress.completed}/${enrollment.progress.total} aulas`}
                  </p>
                </div>

                {enrollment.status === "COMPLETED" && enrollment.completedAt && (
                  <p className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500">
                    Concluído em {new Date(enrollment.completedAt).toLocaleDateString("pt-BR")}
                  </p>
                )}

                {enrollment.status !== "COMPLETED" && (
                  <ResumeCourseButton
                    courseId={enrollment.course.id}
                    loading={continueLoading === enrollment.course.id}
                    onResume={resumeCourse}
                  />
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
