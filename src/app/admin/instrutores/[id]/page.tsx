"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface InstructorProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  headline: string | null;
  bio: string | null;
}

interface InstructorMetrics {
  totalCourses: number;
  publishedCourses: number;
  pendingCourses: number;
  draftCourses: number;
  rejectedCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  totalLessonsCompleted: number;
  totalHours: number;
  averageRating: number;
  totalReviews: number;
}

interface CourseSummary {
  id: string;
  title: string;
  category: string | null;
  published: boolean;
  approvalStatus: string;
  rejectionReason: string | null;
  modulesCount: number;
  lessonsCount: number;
  totalDuration: number;
  studentsCount: number;
  averageRating: number | null;
  totalReviews: number;
  createdAt: string;
}

interface MonthData {
  month: string;
  count: number;
}

export default function AdminInstructorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [instructor, setInstructor] = useState<InstructorProfile | null>(null);
  const [metrics, setMetrics] = useState<InstructorMetrics | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [monthlyEnrollments, setMonthlyEnrollments] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/instructor-metrics/${id}`);
        if (res.ok) {
          const data = await res.json();
          setInstructor(data.instructor);
          setMetrics(data.metrics);
          setCourses(data.courses);
          setMonthlyEnrollments(data.monthlyEnrollments);
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
          <Link href="/admin" className="mt-4 inline-block text-sm text-zinc-600 underline">
            ← Voltar ao Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    approved: { label: "Publicados", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    pending: { label: "Pendentes", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
    draft: { label: "Rascunhos", color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
    rejected: { label: "Rejeitados", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  };

  const maxEnrollment = Math.max(...monthlyEnrollments.map((m) => m.count), 1);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/admin" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
            ← Dashboard Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Instructor Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 text-2xl font-bold text-white dark:from-zinc-600 dark:to-zinc-500">
              {instructor.name?.[0] || "?"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{instructor.name}</h1>
              {instructor.headline && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{instructor.headline}</p>
              )}
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{instructor.email}</p>
            </div>
          </div>
        </div>

        {instructor.bio && (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{instructor.bio}</p>
          </div>
        )}

        {/* Metrics Cards */}
        {metrics && (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Cursos</p>
                <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{metrics.totalCourses}</p>
                <p className="mt-1 text-xs text-zinc-400">{metrics.publishedCourses} publicados</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Alunos</p>
                <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{metrics.totalStudents}</p>
                <p className="mt-1 text-xs text-zinc-400">{metrics.totalEnrollments} matrículas</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Aulas Concluídas</p>
                <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{metrics.totalLessonsCompleted}</p>
                <p className="mt-1 text-xs text-zinc-400">{metrics.totalHours}h de conteúdo</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Avaliações</p>
                <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">
                  {metrics.averageRating > 0 ? metrics.averageRating.toFixed(1) : "—"}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{metrics.totalReviews} reviews</p>
              </div>
            </div>

            {/* Course Status Breakdown */}
            <div className="mb-8 grid gap-3 sm:grid-cols-4">
              {Object.entries(statusConfig).map(([key, config]) => {
                const count =
                  key === "approved"
                    ? metrics.publishedCourses
                    : key === "pending"
                      ? metrics.pendingCourses
                      : key === "draft"
                        ? metrics.draftCourses
                        : metrics.rejectedCourses;
                return (
                  <div
                    key={key}
                    className={`rounded-lg border px-4 py-3 text-center ${key === "pending" && count > 0 ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30" : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"}`}
                  >
                    <p className={`text-2xl font-bold ${count > 0 ? "text-zinc-900 dark:text-white" : "text-zinc-400"}`}>{count}</p>
                    <p className={`text-xs font-medium ${count > 0 ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-400"}`}>{config.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Monthly Enrollments Chart (bar chart) */}
            {monthlyEnrollments.length > 0 && (
              <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
                  Matrículas por Mês (últimos 6 meses)
                </h2>
                <div className="flex items-end gap-3" style={{ height: "120px" }}>
                  {monthlyEnrollments.map((item) => (
                    <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-medium text-zinc-500">{item.count}</span>
                      <div
                        className="w-full rounded-t-md bg-zinc-900 transition-all dark:bg-white"
                        style={{
                          height: `${Math.max((item.count / maxEnrollment) * 80, 4)}px`,
                          opacity: item.count > 0 ? 1 : 0.3,
                        }}
                      />
                      <span className="text-[10px] text-zinc-400">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Courses Table */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Todos os Cursos ({courses.length})
            </h2>
          </div>
          {courses.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">Nenhum curso criado ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Título</th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Categoria</th>
                    <th className="px-6 py-3 text-center font-medium text-zinc-500">Aulas</th>
                    <th className="px-6 py-3 text-center font-medium text-zinc-500">Alunos</th>
                    <th className="px-6 py-3 text-center font-medium text-zinc-500">⭐</th>
                    <th className="px-6 py-3 text-center font-medium text-zinc-500">Status</th>
                    <th className="px-6 py-3 text-right font-medium text-zinc-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {courses.map((course) => (
                    <tr key={course.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{course.title}</td>
                      <td className="px-6 py-4 text-zinc-500">{course.category || "—"}</td>
                      <td className="px-6 py-4 text-center text-zinc-500">{course.lessonsCount}</td>
                      <td className="px-6 py-4 text-center text-zinc-500">{course.studentsCount}</td>
                      <td className="px-6 py-4 text-center text-zinc-500">
                        {course.averageRating ? (
                          <span className="text-amber-500">{course.averageRating.toFixed(1)}</span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          course.approvalStatus === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                          course.approvalStatus === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                          course.approvalStatus === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                          "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}>
                          {course.approvalStatus === "approved" ? "Publicado" :
                           course.approvalStatus === "pending" ? "Pendente" :
                           course.approvalStatus === "rejected" ? "Rejeitado" : "Rascunho"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/cursos/${course.id}/editar`}
                          className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
