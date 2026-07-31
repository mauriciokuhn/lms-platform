"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { StarRating } from "@/components/ui/star-rating";

interface InstructorCourse {
  id: string;
  title: string;
  description: string;
  category: string | null;
  modulesCount: number;
  lessonsCount: number;
  studentsCount: number;
  averageRating: number | null;
  totalReviews: number;
}

interface InstructorProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  headline: string | null;
  bio: string | null;
  coursesCount: number;
  totalStudents: number;
  courses: InstructorCourse[];
}

export default function InstructorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [instructor, setInstructor] = useState<InstructorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/instructors/${id}`);
        if (res.ok) {
          const data = await res.json();
          setInstructor(data);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <p className="text-zinc-500 dark:text-zinc-400">Instrutor não encontrado</p>
          <Link href="/instrutores" className="mt-4 inline-block text-sm text-zinc-600 underline">
            Ver todos os instrutores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white">
            LMS Platform
          </Link>
          <Link
            href="/instrutores"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            ← Todos os instrutores
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12">
        {/* Profile Header */}
        <div className="mb-12 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start sm:gap-8">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 text-3xl font-bold text-white dark:from-zinc-600 dark:to-zinc-500">
            {instructor.name?.[0] || "?"}
          </div>
          <div className="mt-4 sm:mt-0">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              {instructor.name}
            </h1>
            {instructor.headline && (
              <p className="mt-1 text-lg text-zinc-500 dark:text-zinc-400">
                {instructor.headline}
              </p>
            )}
            {instructor.bio && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {instructor.bio}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {instructor.coursesCount} {instructor.coursesCount === 1 ? "curso" : "cursos"}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {instructor.totalStudents} alunos
              </span>
            </div>
          </div>
        </div>

        {/* Courses by this instructor */}
        <h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
          Cursos de {instructor.name?.split(" ")[0]}
        </h2>

        {instructor.courses.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-zinc-500 dark:text-zinc-400">
              Este instrutor ainda não publicou cursos.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {instructor.courses.map((course) => (
              <Link
                key={course.id}
                href={`/cursos/${course.id}`}
                className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="mb-4 flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
                  <svg className="h-8 w-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {course.category && (
                  <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {course.category}
                  </span>
                )}
                <h3 className="mt-2 text-lg font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300 transition-colors">
                  {course.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {course.description}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
                  <span>{course.lessonsCount} aulas</span>
                  <span>{course.modulesCount} módulos</span>
                  <span>{course.studentsCount} alunos</span>
                </div>
                {course.averageRating && (
                  <div className="mt-2">
                    <StarRating rating={course.averageRating} size="sm" showValue totalReviews={course.totalReviews} />
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
