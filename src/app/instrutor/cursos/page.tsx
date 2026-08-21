"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

interface Course {
  id: string;
  title: string;
  category: string | null;
  published: boolean;
  studentsCount: number;
  lessonsCount: number;
  averageRating: number | null;
  totalReviews: number;
}

const statusColors: Record<string, string> = {
  true: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  false: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/instructor/dashboard");
        if (res.ok) {
          const data = await res.json();
          setCourses(data.courses);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700" />
            <div className="absolute inset-0 flex items-center justify-center text-lg">📚</div>
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando cursos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/instrutor"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Meus Cursos</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/instrutor" className="hidden text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white sm:block">
              Dashboard
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-zinc-500 dark:text-zinc-400">
              Gerencie o conteúdo dos seus cursos
            </p>
          </div>
          <Link
            href="/instrutor/cursos/novo"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Curso
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-5xl mb-4">📚</p>
            <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
              Nenhum curso ainda
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Comece criando seu primeiro curso para ensinar alunos.
            </p>
            <Link
              href="/instrutor/cursos/novo"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Criar Primeiro Curso
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/admin/cursos/${course.id}/editar`}
                className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[String(course.published)]}`}>
                    {course.published ? "Publicado" : "Rascunho"}
                  </span>
                  {course.category && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {course.category}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300 transition-colors">
                  {course.title}
                </h3>
                <div className="mt-3 flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
                  <span>📝 {course.lessonsCount} aulas</span>
                  <span>👥 {course.studentsCount} alunos</span>
                  {course.averageRating && (
                    <span>⭐ {course.averageRating} ({course.totalReviews})</span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                  Editar
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
