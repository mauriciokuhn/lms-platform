"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

interface AnalyticsData {
  monthlyEnrollments: { month: string; enrollments: number }[];
  completionByCourse: { course: string; completed: number; total: number; rate: number }[];
  quizScoreDistribution: { range: string; count: number }[];
  engagementHeatmap: { day: string; hour: number; value: number }[];
  topCourses: { course: string; students: number; completionRate: number }[];
  dailyActiveUsers: { date: string; users: number }[];
}

const COLORS = ["#18181b", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/admin/analytics?range=${timeRange}`);
        if (res.ok) {
          const data = await res.json();
          setData(data);
        }
      } catch (err) {
        console.error("Error loading analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [timeRange]);

  function exportCSV() {
    if (!data) return;
    const headers = "Mês,Matrículas\n" +
      data.monthlyEnrollments.map(e => `${e.month},${e.enrollments}`).join("\n");
    const blob = new Blob([headers], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-zinc-500 dark:text-zinc-400">Nenhum dado disponível ainda.</div>;
  }

  const totalEnrollments = data.monthlyEnrollments.reduce((a, b) => a + b.enrollments, 0);
  const avgCompletion = data.completionByCourse.length > 0
    ? Math.round(data.completionByCourse.reduce((a, b) => a + b.rate, 0) / data.completionByCourse.length)
    : 0;
  const totalStudents = data.topCourses.reduce((a, b) => a + b.students, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Insights e métricas da plataforma</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  timeRange === r
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                {r === "7d" ? "7 dias" : r === "30d" ? "30 dias" : "90 dias"}
              </button>
            ))}
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Matrículas" value={totalEnrollments.toString()} subtitle="No período" />
        <MetricCard title="Taxa de Conclusão" value={`${avgCompletion}%`} subtitle="Média entre cursos" />
        <MetricCard title="Alunos Ativos" value={totalStudents.toString()} subtitle="Com matrícula ativa" />
        <MetricCard title="Cursos" value={data.topCourses.length.toString()} subtitle="Com dados registrados" />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Enrollments */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Matrículas por Mês</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.monthlyEnrollments.length > 0 ? data.monthlyEnrollments : [{ month: "Sem dados", enrollments: 0 }]}>
              <defs>
                <linearGradient id="colorEnroll" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#a1a1aa" />
              <YAxis tick={{ fontSize: 11 }} stroke="#a1a1aa" />
              <Tooltip />
              <Area type="monotone" dataKey="enrollments" stroke="#18181b" fill="url(#colorEnroll)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Completion by Course */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Taxa de Conclusão por Curso</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.completionByCourse.length > 0 ? data.completionByCourse : [{ course: "Sem dados", completed: 0, total: 1, rate: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="course" tick={{ fontSize: 10 }} stroke="#a1a1aa" angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} stroke="#a1a1aa" unit="%" />
              <Tooltip />
              <Bar dataKey="rate" fill="#18181b" radius={[4, 4, 0, 0]} name="Taxa de Conclusão" unit="%" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quiz Score Distribution */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Distribuição de Notas (Quizzes)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.quizScoreDistribution.length > 0 ? data.quizScoreDistribution : [{ range: "Sem dados", count: 1 }]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="count"
                nameKey="range"
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {(data.quizScoreDistribution.length > 0 ? data.quizScoreDistribution : [{ range: "Sem dados", count: 1 }]).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                formatter={(value) => <span className="text-xs text-zinc-600 dark:text-zinc-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Heatmap */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Engajamento (Dia x Horário)</h2>
          <div className="grid grid-cols-8 gap-1">
            <div className="text-[9px] text-zinc-400" />
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="text-center text-[9px] text-zinc-400">{i * 3 + 6}h</div>
            ))}
            {DAYS.map((day, di) => (
              <>
                <div key={day} className="text-[9px] text-zinc-500 font-medium">{day}</div>
                {Array.from({ length: 7 }, (_, hi) => {
                  const value = data.engagementHeatmap.find(
                    d => d.day === day && d.hour === (hi * 3 + 6)
                  )?.value || 0;
                  const maxVal = Math.max(...data.engagementHeatmap.map(d => d.value), 1);
                  const intensity = Math.min(value / maxVal, 1);
                  return (
                    <div
                      key={`${di}-${hi}`}
                      className="aspect-square rounded"
                      style={{
                        backgroundColor: intensity > 0
                          ? `rgba(24, 24, 27, ${0.1 + intensity * 0.7})`
                          : "#f4f4f5",
                      }}
                      title={`${day} ${hi * 3 + 6}h: ${value} acessos`}
                    />
                  );
                })}
              </>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-zinc-400">
            <span>Menos</span>
            <div className="flex gap-0.5">
              <div className="h-3 w-3 rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-3 rounded" style={{ backgroundColor: "rgba(24,24,27,0.2)" }} />
              <div className="h-3 w-3 rounded" style={{ backgroundColor: "rgba(24,24,27,0.4)" }} />
              <div className="h-3 w-3 rounded" style={{ backgroundColor: "rgba(24,24,27,0.6)" }} />
              <div className="h-3 w-3 rounded" style={{ backgroundColor: "rgba(24,24,27,0.8)" }} />
            </div>
            <span>Mais</span>
          </div>
        </div>

        {/* Daily Active Users */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Usuários Ativos por Dia</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.dailyActiveUsers.length > 0 ? data.dailyActiveUsers : [{ date: "Sem dados", users: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#a1a1aa" />
              <YAxis tick={{ fontSize: 11 }} stroke="#a1a1aa" />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} dot={false} name="Usuários" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Courses */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">Cursos Mais Populares</h2>
          {data.topCourses.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum curso com dados ainda.</p>
          ) : (
            <div className="space-y-3">
              {data.topCourses.map((course, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {i + 1}
                    </span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{course.course}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{course.students} alunos</span>
                    <span className={`font-medium ${course.completionRate > 50 ? "text-green-600" : "text-amber-600"}`}>
                      {course.completionRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
