"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Metrics {
  totalStudents: number;
  totalCourses: number;
  totalPublishedCourses: number;
  totalEnrollments: number;
  totalCompletedEnrollments: number;
  totalCertificates: number;
  completionRate: number;
}

interface RecentEnrollment {
  id: string;
  userName: string;
  courseTitle: string;
  enrolledAt: string;
}

interface RecentStudent {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface InstructorMetric {
  id: string;
  name: string;
  email: string;
  headline: string | null;
  totalCourses: number;
  publishedCount: number;
  pendingCount: number;
  totalStudents: number;
}

interface ChallengeStats {
  total: { issued: number; solved: number; failed: number; solveRate: number | null };
  byAccount: { email: string; issued: number; solved: number; failed: number }[];
}

interface SecurityEvents {
  logins: number;
  distinctUsers: number;
  revokedSessions: { userEmail: string; when: string }[];
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentEnrollments, setRecentEnrollments] = useState<RecentEnrollment[]>([]);
  const [recentStudents, setRecentStudents] = useState<RecentStudent[]>([]);
  const [instructorMetrics, setInstructorMetrics] = useState<InstructorMetric[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [challengeStats, setChallengeStats] = useState<ChallengeStats | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvents | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Session-history housekeeping (old/revoked records) — fire and
        // forget so it never blocks the dashboard render.
        fetch("/api/admin/security-cleanup", { method: "POST" }).catch(() => {});

        // The daily security digest POST doubles as the card's data source
        // (idempotent per day — the email fires at most once).
        const [metricsRes, instrRes, challengeRes, securityRes] = await Promise.all([
          fetch("/api/admin/metrics"),
          fetch("/api/admin/instructor-metrics"),
          fetch("/api/admin/challenge-stats"),
          fetch("/api/admin/security-summary", { method: "POST" }),
        ]);
        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data.metrics);
          setRecentEnrollments(data.recentEnrollments);
          setRecentStudents(data.recentStudents);
        }
        if (instrRes.ok) {
          const data = await instrRes.json();
          setInstructorMetrics(data.instructors || []);
          setPendingCount(data.pendingCourses || 0);
        }
        if (challengeRes.ok) {
          const data = await challengeRes.json();
          setChallengeStats(data.stats);
        }
        if (securityRes.ok) {
          const data = await securityRes.json();
          setSecurityEvents(data.events || null);
        }
      } catch (err) {
        console.error("Error loading metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Dashboard Administrativo
        </h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Visão geral da plataforma
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="relative mx-auto mb-4 h-12 w-12">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700" />
              <div className="absolute inset-0 flex items-center justify-center text-lg">📊</div>
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando métricas...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:shadow-md">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total de Alunos</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {metrics?.totalStudents ?? 0}
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Alunos cadastrados</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:shadow-md">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Cursos</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {metrics?.totalCourses ?? 0}
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                {metrics?.totalPublishedCourses ?? 0} publicados
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:shadow-md">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Matrículas</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {metrics?.totalEnrollments ?? 0}
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                {metrics?.totalCompletedEnrollments ?? 0} concluídas
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:shadow-md">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Certificados</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                {metrics?.totalCertificates ?? 0}
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Taxa de conclusão: {metrics?.completionRate ?? 0}%
              </p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Matrículas Recentes
              </h2>
              {recentEnrollments.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Nenhuma matrícula ainda</p>
              ) : (
                <div className="space-y-3">
                  {recentEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {enrollment.userName}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {enrollment.courseTitle}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {enrollment.enrolledAt
                          ? new Date(enrollment.enrolledAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Alunos Recentes
              </h2>
              {recentStudents.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Nenhum aluno ainda</p>
              ) : (
                <div className="space-y-3">
                  {recentStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {student.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{student.email}</p>
                      </div>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {new Date(student.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Anti-bot Challenge Metrics */}
          <div className="mb-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                🛡️ Desafio Anti-Bot
              </h2>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">desde o último restart</span>
            </div>
            {!challengeStats ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">Sem dados ainda.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Desafios emitidos</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{challengeStats.total.issued}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Resolvidos</p>
                  <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{challengeStats.total.solved}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Falhos</p>
                  <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{challengeStats.total.failed}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Taxa de acerto</p>
                  <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {challengeStats.total.solveRate === null ? "—" : `${challengeStats.total.solveRate}%`}
                  </p>
                </div>
              </div>
            )}
            {challengeStats && challengeStats.byAccount.length > 0 && (
              <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Contas mais visadas (por falhas)
                </p>
                <div className="space-y-1">
                  {challengeStats.byAccount
                    .slice(0, 5)
                    .map((acc) => (
                      <div key={acc.email} className="flex items-center justify-between text-sm">
                        <span className="truncate text-zinc-700 dark:text-zinc-300">{acc.email}</span>
                        <span className="shrink-0 text-xs text-zinc-400">
                          {acc.failed} falha{acc.failed === 1 ? "" : "s"} · {acc.issued} emitidos
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily Security Summary */}
          <div className="mb-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                🛡️ Resumo de Segurança de Hoje
              </h2>
              <Link
                href="/admin/alunos"
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                Gerenciar Sessões →
              </Link>
            </div>
            {!securityEvents ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">Sem dados ainda.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Logins registrados</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{securityEvents.logins}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Usuários distintos</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{securityEvents.distinctUsers}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sessões encerradas</p>
                    <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                      {securityEvents.revokedSessions.length}
                    </p>
                  </div>
                </div>
                {securityEvents.revokedSessions.length > 0 && (
                  <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Sessões encerradas hoje
                    </p>
                    <div className="space-y-1">
                      {securityEvents.revokedSessions.slice(0, 5).map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="truncate text-zinc-700 dark:text-zinc-300">{s.userEmail}</span>
                          <span className="shrink-0 text-xs text-zinc-400">{s.when}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pending Courses Alert */}
          {pendingCount > 0 && (
            <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      {pendingCount} curso(s) aguardando aprovação
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Instrutores aguardando revisão. Acesse Cursos &gt; Pendentes para revisar.
                    </p>
                  </div>
                </div>
                <Link
                  href="/admin/cursos"
                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500"
                >
                  Revisar Cursos
                </Link>
              </div>
            </div>
          )}

          {/* Instructor Metrics */}
          {instructorMetrics.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                👨‍🏫 Instrutores Ativos
              </h2>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                      <th className="px-5 py-3 text-left font-medium text-zinc-500">Nome</th>
                      <th className="px-5 py-3 text-center font-medium text-zinc-500">Cursos</th>
                      <th className="px-5 py-3 text-center font-medium text-zinc-500">Publicados</th>
                      <th className="px-5 py-3 text-center font-medium text-zinc-500">⏳ Pendentes</th>
                      <th className="px-5 py-3 text-center font-medium text-zinc-500">Alunos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {instructorMetrics.map((inst) => (
                      <tr key={inst.id} className="bg-white transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                        <td className="px-5 py-4">
                          <Link href={`/admin/instrutores/${inst.id}`} className="font-medium text-zinc-900 hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300 transition-colors">
                            {inst.name}
                          </Link>
                          <p className="text-xs text-zinc-400">{inst.headline || inst.email}</p>
                        </td>
                        <td className="px-5 py-4 text-center text-zinc-600 dark:text-zinc-400">{inst.totalCourses}</td>
                        <td className="px-5 py-4 text-center">
                          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                            {inst.publishedCount}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {inst.pendingCount > 0 ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                              {inst.pendingCount}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400">0</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center text-zinc-600 dark:text-zinc-400">{inst.totalStudents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              Ações Rápidas
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/admin/cursos/novo"
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">Novo Curso</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Crie um novo curso com módulos e aulas
                </p>
              </Link>
              <Link
                href="/admin/cursos"
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">Gerenciar Cursos</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Edite conteúdo, módulos e avaliações
                </p>
              </Link>
              <Link
                href="/admin/alunos"
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">Alunos</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Veja o progresso e desempenho dos alunos
                </p>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
