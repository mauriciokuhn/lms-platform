"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Meus Cursos</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Gerencie o conteúdo dos seus cursos
          </p>
        </div>
        <Link
          href="/instrutor/cursos/novo"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + Novo Curso
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">Você ainda não criou nenhum curso.</p>
          <Link
            href="/instrutor/cursos/novo"
            className="mt-4 inline-block text-sm font-medium text-zinc-900 underline dark:text-white"
          >
            Criar primeiro curso
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
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  course.published
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}>
                  {course.published ? "Publicado" : "Rascunho"}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300 transition-colors">
                {course.title}
              </h3>
              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
                <span>{course.lessonsCount} aulas</span>
                <span>{course.studentsCount} alunos</span>
                {course.averageRating && (
                  <span>{course.averageRating} ★ ({course.totalReviews})</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
