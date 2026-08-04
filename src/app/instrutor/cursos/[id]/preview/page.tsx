"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Module {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: { id: string; title: string; contentType: string; duration: number | null; orderIndex: number }[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string | null;
  thumbnailUrl: string | null;
  approvalStatus: string;
  modules: Module[];
  instructor: { id: string; name: string | null; headline: string | null; image: string | null } | null;
  _count: { enrollments: number };
}

export default function InstructorPreviewCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/courses/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCourse(data);
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
    </div>
  );

  if (!course) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <p className="text-zinc-500">Curso não encontrado</p>
    </div>
  );

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const totalDuration = course.modules.reduce((acc, m) => 
    acc + m.lessons.reduce((lAcc, l) => lAcc + (l.duration || 0), 0), 0);
  const hours = Math.floor(totalDuration / 3600);
  const minutes = Math.floor((totalDuration % 3600) / 60);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <span>👁</span>
            <span className="font-semibold">Modo Preview</span>
            <span className="text-amber-500 dark:text-amber-400">— Visualização de como os alunos verão o curso</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/instrutor/cursos/${course.id}/editar`}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
            >
              Voltar ao Editor
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Course Header */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="aspect-video w-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
            ) : (
              <div className="text-center">
                <span className="text-6xl">
                  {course.category === "Programação" ? "💻" :
                   course.category === "Front-end" ? "🎨" :
                   course.category === "Back-end" ? "⚙️" :
                   course.category === "Data Science" ? "📊" :
                   course.category === "Design" ? "🖌️" : "📚"}
                </span>
                <p className="mt-2 text-sm text-zinc-400">Preview do Curso</p>
              </div>
            )}
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {course.category || "Curso"}
                  </span>
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                    Grátis
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{course.title}</h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{course.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    {course.modules.length} módulos
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {totalLessons} aulas
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`}
                  </span>
                </div>
                {course.instructor && (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {course.instructor.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{course.instructor.name}</p>
                      {course.instructor.headline && (
                        <p className="text-xs text-zinc-400">{course.instructor.headline}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                disabled
                className="rounded-xl bg-zinc-900 px-8 py-3 text-sm font-semibold text-white opacity-50 dark:bg-white dark:text-zinc-900"
              >
                Matricular-se Grátis
              </button>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
            <h2 className="font-semibold text-zinc-900 dark:text-white">Conteúdo do Curso</h2>
            <p className="text-xs text-zinc-400 mt-1">{course.modules.length} módulos · {totalLessons} aulas</p>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {course.modules.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-zinc-400">Nenhum módulo adicionado ainda.</p>
                <Link href={`/instrutor/cursos/${course.id}/editar`} className="mt-2 inline-block text-sm font-medium text-amber-600 hover:underline">
                  Adicionar módulos
                </Link>
              </div>
            ) : (
              course.modules.map((mod, mi) => (
                <details key={mod.id} className="group" open>
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {mi + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{mod.title}</p>
                        <p className="text-xs text-zinc-400">{mod.lessons.length} aulas</p>
                      </div>
                    </div>
                    <svg className="h-5 w-5 text-zinc-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="border-t border-zinc-100 px-6 py-2 dark:border-zinc-800">
                    {mod.lessons.length === 0 ? (
                      <p className="py-3 text-sm text-zinc-400">Nenhuma aula neste módulo.</p>
                    ) : (
                      mod.lessons.map((lesson, li) => {
                        const contentTypeIcons: Record<string, string> = {
                          VIDEO: "🎬", PDF: "📄", TEXT: "📝", LINK: "🔗",
                        };
                        return (
                          <div key={lesson.id} className="flex items-center justify-between rounded-lg px-3 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800">
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center text-xs text-zinc-400">{li + 1}</span>
                              <span className="text-sm">{contentTypeIcons[lesson.contentType] || "📹"}</span>
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">{lesson.title}</span>
                              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {lesson.contentType === "VIDEO" ? "Vídeo" :
                                 lesson.contentType === "PDF" ? "PDF" :
                                 lesson.contentType === "TEXT" ? "Texto" : "Link"}
                              </span>
                            </div>
                            {lesson.duration && (
                              <span className="text-xs text-zinc-400">
                                {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, "0")}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </details>
              ))
            )}
          </div>
        </div>

        {/* Back button */}
        <div className="mt-6 text-center">
          <Link
            href={`/instrutor/cursos/${course.id}/editar`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao Editor
          </Link>
        </div>
      </main>
    </div>
  );
}
