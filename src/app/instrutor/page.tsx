"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

interface DashboardData {
  coursesCount: number;
  totalLessons: number;
  totalEnrollments: number;
  totalCompleted: number;
  completionRate: number;
  totalReviews: number;
  averageRating: number | null;
  courses: {
    id: string;
    title: string;
    category: string | null;
    published: boolean;
    approvalStatus: string;
    studentsCount: number;
    lessonsCount: number;
    averageRating: number | null;
    totalReviews: number;
  }[];
  pendingApprovalCount: number;
}

const statusColors: Record<string, string> = {
  approved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  approved: "Publicado",
  pending: "Pendente",
  rejected: "Rejeitado",
};

export default function InstructorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/instructor/dashboard");
        if (res.ok) {
          const d = await res.json();
          setData(d);
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
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Erro ao carregar dados</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Tente novamente mais tarde.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-bold text-zinc-900 dark:text-white">
              Ponto do Saber
            </Link>
            <span className="hidden rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 sm:inline">
              Instrutor
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/instrutor/cursos" className="hidden text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white sm:block">
              Meus Cursos
            </Link>
            <Link href="/instrutor/perfil" className="hidden text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white sm:block">
              Perfil
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Title + CTA */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Dashboard do Instrutor
            </h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              Visão geral dos seus cursos e alunos
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

        {/* Pending Approval Alert */}
        {data.pendingApprovalCount > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    {data.pendingApprovalCount} curso(s) aguardando aprovação
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    O admin será notificado para revisar seus cursos.
                  </p>
                </div>
              </div>
              <Link
                href="/instrutor/cursos"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                Ver cursos
              </Link>
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Cursos", value: data.coursesCount, sub: `${data.totalLessons} aulas`, icon: "📚" },
            { label: "Alunos", value: data.totalEnrollments, sub: `${data.totalCompleted} concluíram`, icon: "👥" },
            { label: "Conclusão", value: `${data.completionRate}%`, sub: "Média entre cursos", icon: "📊" },
            { label: "Avaliação", value: data.averageRating ? `${data.averageRating}` : "—", sub: `${data.totalReviews} avaliações`, icon: "⭐" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Courses */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Meus Cursos</h2>
            <Link
              href="/instrutor/cursos/novo"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              + Novo Curso
            </Link>
          </div>

          {/* Desktop: Table */}
          <div className="hidden overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                  <th className="px-6 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Curso</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Aulas</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Alunos</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Avaliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {data.courses.map((course) => (
                  <tr key={course.id} className="bg-white transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/cursos/${course.id}/editar`}
                        className="font-medium text-zinc-900 hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
                      >
                        {course.title}
                      </Link>
                      {course.category && (
                        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{course.category}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[course.approvalStatus] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                        {statusLabels[course.approvalStatus] || "Rascunho"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{course.lessonsCount}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{course.studentsCount}</td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {course.averageRating ? `${course.averageRating} ★ (${course.totalReviews})` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Cards */}
          <div className="space-y-3 sm:hidden">
            {data.courses.map((course) => (
              <Link
                key={course.id}
                href={`/admin/cursos/${course.id}/editar`}
                className="block rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-zinc-900 dark:text-white truncate">{course.title}</h3>
                    {course.category && (
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{course.category}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[course.approvalStatus] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                    {statusLabels[course.approvalStatus] || "Rascunho"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>📝 {course.lessonsCount} aulas</span>
                  <span>👥 {course.studentsCount} alunos</span>
                  {course.averageRating && (
                    <span>⭐ {course.averageRating}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {data.courses.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-4xl mb-4">📚</p>
              <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Nenhum curso ainda</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Crie seu primeiro curso para começar a ensinar.
              </p>
              <Link
                href="/instrutor/cursos/novo"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Criar Primeiro Curso
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
