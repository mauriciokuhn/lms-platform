"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-500">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
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
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Curso
        </Link>
      </div>

      {/* Pending Approval Alert */}
      {data.pendingApprovalCount > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">⏳</span>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {data.pendingApprovalCount} curso(s) aguardando aprovação
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  O admin será notificado para revisar seus cursos.
                </p>
              </div>
            </div>
            <Link
              href="/instrutor/cursos"
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500"
            >
              Ver cursos
            </Link>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500">Cursos</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{data.coursesCount}</p>
          <p className="mt-1 text-xs text-zinc-400">{data.totalLessons} aulas no total</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500">Alunos</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{data.totalEnrollments}</p>
          <p className="mt-1 text-xs text-zinc-400">{data.totalCompleted} concluíram</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500">Taxa de Conclusão</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{data.completionRate}%</p>
          <p className="mt-1 text-xs text-zinc-400">Média entre cursos</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500">Avaliação Média</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            {data.averageRating ? `${data.averageRating}` : "—"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{data.totalReviews} avaliações</p>
        </div>
      </div>

      {/* Courses Table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Meus Cursos</h2>
          <Link
            href="/admin/cursos/novo"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + Novo Curso
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                <th className="px-6 py-3 text-left font-medium text-zinc-500">Curso</th>
                <th className="px-6 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-6 py-3 text-left font-medium text-zinc-500">Aulas</th>
                <th className="px-6 py-3 text-left font-medium text-zinc-500">Alunos</th>
                <th className="px-6 py-3 text-left font-medium text-zinc-500">Avaliação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
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
                      <p className="mt-0.5 text-xs text-zinc-400">{course.category}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      course.approvalStatus === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                      course.approvalStatus === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                      course.approvalStatus === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {course.approvalStatus === "approved" ? "Publicado" :
                       course.approvalStatus === "pending" ? "Pendente" :
                       course.approvalStatus === "rejected" ? "Rejeitado" : "Rascunho"}
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
      </div>
    </div>
  );
}
