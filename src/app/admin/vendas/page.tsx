"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface SalesData {
  summary: {
    totalEnrollments: number;
    completedEnrollments: number;
    completionRate: number;
    averagePerCourse: number;
  };
  topCourses: {
    courseId: string;
    title: string;
    category: string | null;
    enrollments: number;
  }[];
  monthlyEnrollments: { month: string; enrollments: number }[];
  recentEnrollments: {
    id: string;
    userName: string;
    userEmail: string;
    courseTitle: string;
    courseUrl: string;
    enrolledAt: string;
  }[];
}

export default function AdminSalesPage() {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/sales");
        if (res.ok) {
          setData(await res.json());
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-zinc-500">Nenhum dado disponível.</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Vendas & Matrículas</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Acompanhe o crescimento da plataforma
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total Matrículas</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">
            {data.summary.totalEnrollments}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Concluídas</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">
            {data.summary.completedEnrollments}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {data.summary.completionRate}% de taxa de conclusão
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Média por Curso</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">
            {data.summary.averagePerCourse}
          </p>
          <p className="mt-1 text-xs text-zinc-400">alunos por curso</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Receita</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">R$ 0</p>
          <p className="mt-1 text-xs text-zinc-400">Stripe não configurado</p>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
          Matrículas por Mês (últimos 12 meses)
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.monthlyEnrollments}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#a1a1aa" />
            <YAxis tick={{ fontSize: 11 }} stroke="#a1a1aa" allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="enrollments" fill="#18181b" radius={[4, 4, 0, 0]} name="Matrículas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Top Courses */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
            Cursos Mais Matriculados
          </h2>
          {data.topCourses.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum curso com matrículas ainda.</p>
          ) : (
            <div className="space-y-3">
              {data.topCourses.map((course, i) => (
                <Link
                  key={course.courseId}
                  href={`/admin/cursos/${course.courseId}/editar`}
                  className="flex items-center justify-between rounded-lg p-2 transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                        {course.title}
                      </p>
                      {course.category && (
                        <p className="text-xs text-zinc-400">{course.category}</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-white">
                    {course.enrollments}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Enrollments */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
            Matrículas Recentes
          </h2>
          {data.recentEnrollments.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhuma matrícula ainda.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {data.recentEnrollments.map((enr) => (
                <div key={enr.id} className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0 last:pb-0 dark:border-zinc-800">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                      {enr.userName}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">{enr.courseTitle}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs text-zinc-400">
                      {enr.enrolledAt
                        ? new Date(enr.enrolledAt).toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Button */}
      <div className="flex gap-3">
        <Link
          href="/api/admin/reports?type=students&format=csv"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar Alunos (CSV)
        </Link>
        <Link
          href="/api/admin/reports?type=enrollments&format=csv"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exportar Matrículas (CSV)
        </Link>
      </div>
    </div>
  );
}
