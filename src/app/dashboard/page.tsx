"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/ui/notification-bell";
import { useGamificationContext } from "@/lib/contexts/gamification-context";
import { XPBar, StreakDisplay, GamificationWidget } from "@/components/ui/gamification-display";
import { useResumeCourse } from "@/lib/hooks/use-resume-course";
import { ResumeCourseButton } from "@/components/ui/resume-course-button";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const WeeklyXpChart = dynamic(
  () => import("@/components/ui/weekly-xp-chart").then((m) => m.WeeklyXpChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[180px] w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
    ),
  }
);

interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  course: {
    id: string;
    title: string;
    category: string | null;
    thumbnailUrl: string | null;
  };
  progress: { total: number; completed: number; percentage: number };
  modules: { id: string; title: string; completed: number; total: number; percentage: number }[];
}

function RecommendationsSection() {
  const [recommendations, setRecommendations] = useState<{
    id: string; title: string; description: string; category: string | null;
    studentsCount: number; modulesCount: number; score: number; reason: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((data) => setRecommendations(data.recommendations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || recommendations.length === 0) return null;

  const categoryIcons: Record<string, string> = {
    "Programação": "💻", "Front-end": "🎨", "Back-end": "⚙️",
    "Data Science": "📊", "Design": "🖌️", "Banco de Dados": "🗄️",
  };

  return (
    <section className="mb-8">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Recomendados para Você</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((course) => (
          <Link
            key={course.id}
            href={`/cursos/${course.id}`}
            className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
              <span className="text-3xl">{categoryIcons[course.category || ""] || "📚"}</span>
            </div>
            {course.category && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {course.category}
              </span>
            )}
            <h4 className="mt-2 font-semibold text-zinc-900 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
              {course.title}
            </h4>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
              {course.description}
            </p>
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
              <span>{course.studentsCount} alunos</span>
              <span>{course.modulesCount} módulos</span>
            </div>
            <div className="mt-2 rounded-lg bg-zinc-50 px-2 py-1 text-center text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {course.reason}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [dailyProgress, setDailyProgress] = useState({ completedToday: 0 });
  const [dailyGoal, setDailyGoalState] = useState(3);
  const [weeklyXp, setWeeklyXp] = useState<{ label: string; date: string; xp: number; lessons: number }[]>([]);
  const [weeklyXpTotal, setWeeklyXpTotal] = useState(0);
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);
  const [weeklyParticipants, setWeeklyParticipants] = useState(0);
  const [platformAverage, setPlatformAverage] = useState(0);
  const [topPercent, setTopPercent] = useState<number | null>(null);
  const [monthAverage, setMonthAverage] = useState(0);
  const [weekDailyAverage, setWeekDailyAverage] = useState(0);
  const [streakAlert, setStreakAlert] = useState<{ atRisk: boolean; streak: number }>({ atRisk: false, streak: 0 });
  const [loading, setLoading] = useState(true);
  // Enrollment ids with the per-module breakdown expanded
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const weeklyCheckedRef = useRef(false);
  const { progress: gamification, loading: gamificationLoading, refresh: refreshGamification } = useGamificationContext();

  // Configurable daily goal — persisted per device (no DB migration needed).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pds-daily-goal");
      if (raw) {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n >= 1 && n <= 10) setDailyGoalState(n);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setDailyGoal = (n: number) => {
    const clamped = Math.min(10, Math.max(1, n));
    setDailyGoalState(clamped);
    try {
      localStorage.setItem("pds-daily-goal", String(clamped));
    } catch {
      // localStorage unavailable
    }
  };
  const { resumeCourse, continueLoading } = useResumeCourse();

  // `silent` skips the welcome toast — used by the SSE real-time refreshes.
  const loadData = useCallback(async (silent = false) => {
    try {
      const [enrollRes, certRes, dailyRes, xpRes, streakRes] = await Promise.all([
        fetch("/api/enrollments"),
        fetch("/api/certificates"),
        fetch("/api/progress/daily"),
        fetch("/api/progress/weekly-xp"),
        fetch("/api/progress/streak-alert"),
      ]);
      if (enrollRes.ok) {
        const enrollData = await enrollRes.json();
        setEnrollments(enrollData);
        if (!silent && enrollData.length > 0 && enrollData[0].enrolledAt) {
          toast.success("Dashboard atualizado!", { description: "Seus cursos foram carregados." });
        }
      }
      if (certRes.ok) {
        const certData = await certRes.json();
        setCertificatesCount(certData.length);
      }
      if (dailyRes.ok) {
        const d = await dailyRes.json();
        setDailyProgress({ completedToday: d.completedToday ?? 0 });
      }
      if (xpRes.ok) {
        const xd = await xpRes.json();
        setWeeklyXp(xd.days || []);
        setWeeklyXpTotal(xd.totalXp || 0);
        setWeeklyRank(xd.weeklyRank ?? null);
        setWeeklyParticipants(xd.totalParticipants || 0);
        setPlatformAverage(xd.platformAverage || 0);
        setTopPercent(xd.topPercent ?? null);
        setMonthAverage(xd.monthAverage || 0);
        setWeekDailyAverage(xd.weekDailyAverage || 0);
      }
      if (streakRes.ok) {
        const sd = await streakRes.json();
        setStreakAlert({ atRisk: !!sd.atRisk, streak: sd.streak || 0 });
      }
    } catch (err) {
      console.error(err);
      if (!silent) toast.error("Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "loading") return;
    loadData();
  }, [status, router, loadData]);

  // Real-time progress: refresh enrollments when a lesson is completed
  // anywhere (SSE "LESSON_COMPLETED" event broadcast by the server).
  useEffect(() => {
    if (!session?.user) return;
    const es = new EventSource("/api/events/subscribe");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "notification" && event.payload?.type === "LESSON_COMPLETED") {
          loadData(true);
          refreshGamification();
        }
      } catch {
        // silent
      }
    };
    es.onerror = () => {};
    return () => es.close();
  }, [session, loadData, refreshGamification]);

  // Weekly study summary: fire once per session — the endpoint is idempotent
  // (creates at most one notification per 7-day window per user).
  useEffect(() => {
    if (!session?.user || weeklyCheckedRef.current) return;
    weeklyCheckedRef.current = true;
    fetch("/api/notifications/weekly-summary", { method: "POST" }).catch(() => {});
    // Streak-at-risk notification: also once per session (endpoint guards 24h).
    fetch("/api/progress/streak-alert", { method: "POST" }).catch(() => {});
  }, [session]);

  const toggleModules = (enrollmentId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  };

  if (!session?.user) return null;

  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE");
  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED");
  const totalCompletedLessons = enrollments.reduce((acc, e) => acc + e.progress.completed, 0);
  const totalLessons = enrollments.reduce((acc, e) => acc + e.progress.total, 0);
  const overallPercentage = totalLessons > 0 ? Math.round((totalCompletedLessons / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Meu Dashboard</h1>
          {/* Desktop nav */}
          <div className="hidden items-center gap-1 sm:flex">
            <Link href="/meus-cursos" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Meus Cursos</Link>
            <Link href="/certificados" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Certificados</Link>
            <GamificationWidget />
            <Link href="/perfil" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">👤 Perfil</Link>
            <Link href="/gamificacao" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">🏆</Link>
            <div className="ml-1 flex items-center gap-3">
              <NotificationBell />
              <ThemeToggle />
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{session.user.name || session.user.email}</span>
              <LogoutButton />
            </div>
          </div>
          {/* Mobile nav */}
          <div className="flex items-center gap-2 sm:hidden">
            <Link href="/meus-cursos" className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Cursos</Link>
            <Link href="/certificados" className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">Cert.</Link>
            <GamificationWidget />
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
          </div>
        ) : (
          <>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Olá, {session.user.name || "Aluno"}!</h2>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">Continue seus estudos de onde parou.</p>
            </div>

            {/* Streak at risk — no lesson completed today with an active streak */}
            {streakAlert.atRisk && (
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/30">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔥</span>
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Streak de {streakAlert.streak} {streakAlert.streak === 1 ? "dia" : "dias"} em risco!
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300/80">
                      Você ainda não completou nenhuma aula hoje. Complete 1 aula para não perder sua sequência.
                    </p>
                  </div>
                </div>
                <Link
                  href="/meus-cursos"
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
                >
                  Continuar estudando
                </Link>
              </div>
            )}

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Cursos Ativos", value: activeEnrollments.length },
                { label: "Concluídos", value: completedEnrollments.length },
                { label: "Aulas Completas", value: totalCompletedLessons },
                { label: "Certificados", value: certificatesCount },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Daily Goal — configurable (persisted per device) */}
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Meta Diária</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                    {dailyProgress.completedToday}
                    <span className="text-base font-medium text-zinc-400"> de {dailyGoal} aulas hoje</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{dailyProgress.completedToday >= dailyGoal ? "🎉" : "🎯"}</span>
                  <div className="flex items-center overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <button
                      type="button"
                      aria-label="Diminuir meta diária"
                      onClick={() => setDailyGoal(dailyGoal - 1)}
                      disabled={dailyGoal <= 1}
                      className="flex h-8 w-8 items-center justify-center text-lg font-semibold text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      −
                    </button>
                    <span className="min-w-9 text-center text-sm font-bold text-zinc-900 dark:text-white">{dailyGoal}</span>
                    <button
                      type="button"
                      aria-label="Aumentar meta diária"
                      onClick={() => setDailyGoal(dailyGoal + 1)}
                      disabled={dailyGoal >= 10}
                      className="flex h-8 w-8 items-center justify-center text-lg font-semibold text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, (dailyProgress.completedToday / dailyGoal) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                {dailyProgress.completedToday >= dailyGoal
                  ? "Meta atingida! Continue assim 🚀"
                  : `Faltam ${dailyGoal - dailyProgress.completedToday} aula(s) para bater a meta de hoje`}
              </p>
            </div>

            {enrollments.length > 0 && (
              <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Progresso Geral</h3>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overallPercentage}%</span>
                </div>
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-zinc-700 to-zinc-900 transition-all duration-500 dark:from-zinc-500 dark:to-zinc-300" style={{ width: `${overallPercentage}%` }} />
                </div>
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">{totalCompletedLessons} de {totalLessons} aulas concluídas</p>
              </div>
            )}

            {/* Weekly XP evolution */}
            {weeklyXp.length > 0 && (
              <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Evolução de XP</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                      +{weeklyXpTotal} XP
                      <span className="text-sm font-medium text-zinc-400"> nos últimos 7 dias</span>
                    </p>
                  </div>
                  <span className="text-3xl">📈</span>
                </div>
                <div className="mt-4">
                  <WeeklyXpChart data={weeklyXp} />
                </div>
                {/* Weekly comparison: rank + platform average */}
                {(weeklyRank !== null || platformAverage > 0) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sua posição na semana</p>
                      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                        {weeklyRank !== null ? `#${weeklyRank}` : "—"}
                        <span className="text-sm font-medium text-zinc-400">
                          {" "}de {weeklyParticipants} aluno{weeklyParticipants === 1 ? "" : "s"} ativo{weeklyParticipants === 1 ? "" : "s"}
                        </span>
                      </p>
                      {topPercent !== null && weeklyParticipants > 1 && (
                        <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          🏅 Entre os {topPercent}% mais ativos
                        </p>
                      )}
                      {weeklyParticipants <= 1 && weeklyRank !== null && (
                        <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          🌟 Único aluno ativo nesta semana
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/60">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sua semana vs. média da plataforma</p>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                          <span>Você</span>
                          <span className="font-semibold">+{weeklyXpTotal} XP</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                            style={{ width: `${Math.round((weeklyXpTotal / Math.max(1, weeklyXpTotal, platformAverage)) * 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
                          <span>Média</span>
                          <span className="font-semibold">+{platformAverage} XP</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                          <div
                            className="h-full rounded-full bg-zinc-400/70 transition-all duration-500 dark:bg-zinc-500"
                            style={{ width: `${Math.round((platformAverage / Math.max(1, weeklyXpTotal, platformAverage)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Personal pace: this week vs. your 30-day average */}
                {monthAverage > 0 && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-100 bg-gradient-to-r from-amber-50/80 to-orange-50/60 px-4 py-3 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/20">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {weekDailyAverage > monthAverage ? "📈" : weekDailyAverage < monthAverage ? "📉" : "🎯"}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Seu ritmo pessoal</p>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {weekDailyAverage} XP/dia esta semana
                          <span className="font-normal text-zinc-400"> vs. média de {monthAverage} XP/dia (30 dias)</span>
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        weekDailyAverage > monthAverage
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                          : weekDailyAverage < monthAverage
                            ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            : "bg-green-500/15 text-green-700 dark:text-green-300"
                      }`}
                    >
                      {weekDailyAverage > monthAverage
                        ? "Acima da sua média 🚀"
                        : weekDailyAverage < monthAverage
                          ? "Abaixo da sua média"
                          : "No seu ritmo 🎯"}
                    </span>
                  </div>
                )}
                <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                  Conclua aulas para manter o ritmo — o gráfico atualiza em tempo real.
                </p>
              </div>
            )}

            {activeEnrollments.length > 0 && (
              <section className="mb-8">
                <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Em Andamento</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeEnrollments.map((enrollment) => (
                    <Link key={enrollment.id} href={`/cursos/${enrollment.course.id}`}
                      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900">
                      <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
                        <svg className="h-8 w-8 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      {enrollment.course.category && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{enrollment.course.category}</span>
                      )}
                      <h4 className="mt-2 font-semibold text-zinc-900 dark:text-white">{enrollment.course.title}</h4>
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                          <span>Progresso</span>
                          <span>{enrollment.progress.percentage}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                          <div className="h-full rounded-full bg-zinc-900 transition-all duration-500 dark:bg-zinc-300" style={{ width: `${enrollment.progress.percentage}%` }} />
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{enrollment.progress.completed}/{enrollment.progress.total} aulas</p>
                      {enrollment.modules && enrollment.modules.length > 0 && (
                        <>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleModules(enrollment.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleModules(enrollment.id);
                              }
                            }}
                            aria-expanded={expandedModules.has(enrollment.id)}
                            className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                          >
                            <span>📚 Progresso por módulo</span>
                            <svg
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedModules.has(enrollment.id) ? "rotate-180" : ""}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                          {expandedModules.has(enrollment.id) && (
                            <div className="mt-3 space-y-2.5">
                              {enrollment.modules.map((mod) => (
                                <div key={mod.id}>
                                  <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                                    <span className="truncate">{mod.title}</span>
                                    <span className="shrink-0">
                                      {mod.completed}/{mod.total} · {mod.percentage}%
                                    </span>
                                  </div>
                                  <div
                                    className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                                    role="progressbar"
                                    aria-valuenow={mod.percentage}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuetext={`${mod.percentage}%`}
                                  >
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${mod.percentage === 100 ? "bg-green-500" : "bg-amber-500"}`}
                                      style={{ width: `${mod.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      <ResumeCourseButton
                        courseId={enrollment.course.id}
                        loading={continueLoading === enrollment.course.id}
                        onResume={resumeCourse}
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Gamificação Summary */}
            {gamification && !gamificationLoading && (
              <section className="mb-8 grid gap-4 sm:grid-cols-2">
                <XPBar xp={gamification.xp} />
                <StreakDisplay streak={gamification.streak} />
              </section>
            )}

            {enrollments.length === 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                    <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Nenhum curso ainda</h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Matricule-se em um curso para começar.</p>
                <Link href="/cursos" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600">
                  Explorar Cursos
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            )}

            {enrollments.length > 0 && !loading && <RecommendationsSection />}

            {enrollments.length > 0 && (
              <div className="text-center">
                <Link href="/cursos" className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600">
                  Explorar Cursos <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
