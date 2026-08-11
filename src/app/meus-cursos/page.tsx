"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GamificationWidget } from "@/components/ui/gamification-display";

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
  const { data: session } = useSession();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      router.push("/login");
      return;
    }

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
  }, [session, router]);

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
        <p className="mb-8 text-zinc-500 dark:text-zinc-400">Acompanhe o progresso dos seus cursos</p>

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
            {enrollments.map((enrollment) => (
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
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
