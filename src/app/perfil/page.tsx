"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GamificationWidget } from "@/components/ui/gamification-display";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoutButton } from "@/components/logout-button";

interface ProfileData {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    headline: string | null;
    bio: string | null;
    createdAt: string;
  };
  xp: { current: number; level: number; nextLevelAt: number };
  streak: { current: number; longest: number };
  badges: { id: string; badge: string; title: string; description: string | null; icon: string | null; earnedAt: string }[];
  certificates: { id: string; courseTitle: string; issuedAt: string; code: string }[];
  stats: { coursesActive: number; coursesCompleted: number; lessonsCompleted: number; quizzesPassed: number };
}

const badgeIcons: Record<string, string> = {
  FIRST_LESSON: "🎯", FAST_LEARNER: "⚡", TOP_SCORE: "🏆",
  STREAK_3: "🔥", STREAK_7: "🔥", STREAK_30: "🔥",
  COURSE_COMPLETE: "🎓", PERFECT_QUIZ: "💯", SOCIAL_BUTTERFLY: "🦋", EARLY_ADOPTER: "🌟",
};

export default function PerfilPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "badges" | "certificates">("overview");

  useEffect(() => {
    if (!session?.user) { router.push("/login"); return; }

    async function load() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) setProfile(await res.json());
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [session, router]);

  if (!session?.user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Erro ao carregar perfil.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-lg font-bold text-zinc-900 dark:text-white">
            LMS Platform
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400">Dashboard</Link>
            <GamificationWidget />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Profile Header */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="h-32 bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-800 dark:to-zinc-700" />
          <div className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
              <div className="-mt-12 flex items-end gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-zinc-200 to-zinc-300 text-3xl shadow-lg dark:border-zinc-900 dark:from-zinc-700 dark:to-zinc-600">
                  {profile.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- user profile image
                    <img src={profile.user.image} alt="" className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    session.user.name?.charAt(0).toUpperCase() || "👤"
                  )}
                </div>
                <div className="pb-1">
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {profile.user.name || "Aluno"}
                  </h1>
                  {profile.user.headline && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{profile.user.headline}</p>
                  )}
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{profile.user.email}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 sm:mt-0">
                <div className="rounded-xl bg-amber-50 px-4 py-2 text-center dark:bg-amber-950/40">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{profile.xp.level}</p>
                  <p className="text-[10px] text-amber-500 dark:text-amber-400">Nível</p>
                </div>
                <div className="rounded-xl bg-orange-50 px-4 py-2 text-center dark:bg-orange-950/40">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">🔥{profile.streak.current}</p>
                  <p className="text-[10px] text-orange-500 dark:text-orange-400">Streak</p>
                </div>
              </div>
            </div>
            {profile.user.bio && (
              <p className="mt-4 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">{profile.user.bio}</p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Cursos Ativos", value: profile.stats.coursesActive, icon: "📚" },
            { label: "Concluídos", value: profile.stats.coursesCompleted, icon: "🎓" },
            { label: "Aulas Feitas", value: profile.stats.lessonsCompleted, icon: "📝" },
            { label: "Quizzes Aprovados", value: profile.stats.quizzesPassed, icon: "✅" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</p>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* XP Progress Bar */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Experiência (XP)</p>
            <p className="text-sm text-zinc-500">{profile.xp.current} / {profile.xp.nextLevelAt}</p>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-700"
              style={{ width: `${Math.min((profile.xp.current / profile.xp.nextLevelAt) * 100, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-400">Nível {profile.xp.level} — {profile.xp.nextLevelAt - profile.xp.current} XP para o próximo nível</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
          {[
            { id: "overview" as const, label: "Visão Geral", icon: "👤" },
            { id: "badges" as const, label: `Badges (${profile.badges.length})`, icon: "🏅" },
            { id: "certificates" as const, label: `Certificados (${profile.certificates.length})`, icon: "🎓" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {profile.badges.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">Badges Recentes</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.badges.slice(0, 6).map((b) => (
                    <div key={b.id} className="group relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-lg shadow-sm transition hover:scale-110 dark:from-amber-950/50 dark:to-amber-900/30">
                      {badgeIcons[b.badge] || "🏅"}
                      <div className="absolute -bottom-1 left-1/2 z-10 hidden -translate-x-1/2 translate-y-full whitespace-nowrap rounded-lg bg-zinc-900 px-2 py-1 text-[10px] text-white shadow-lg group-hover:block dark:bg-zinc-100 dark:text-zinc-900">
                        {b.title}
                      </div>
                    </div>
                  ))}
                  {profile.badges.length > 6 && (
                    <button onClick={() => setActiveTab("badges")} className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-500 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">
                      +{profile.badges.length - 6}
                    </button>
                  )}
                </div>
              </div>
            )}

            {profile.certificates.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">Últimos Certificados</h3>
                <div className="space-y-2">
                  {profile.certificates.slice(0, 3).map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{c.courseTitle}</p>
                        <p className="text-xs text-zinc-400">{new Date(c.issuedAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <Link href={`/certificados/${c.code}`} className="text-xs font-medium text-amber-600 hover:underline dark:text-amber-400">
                        Visualizar →
                      </Link>
                    </div>
                  ))}
                  {profile.certificates.length > 3 && (
                    <button onClick={() => setActiveTab("certificates")} className="w-full rounded-lg bg-zinc-100 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400">
                      Ver todos ({profile.certificates.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "badges" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            {profile.badges.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">Nenhum badge conquistado ainda. Continue estudando!</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {profile.badges.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-xl dark:from-amber-950/50 dark:to-amber-900/30">
                      {badgeIcons[b.badge] || "🏅"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{b.title}</p>
                      {b.description && <p className="text-xs text-zinc-500">{b.description}</p>}
                      <p className="text-[10px] text-zinc-400">{new Date(b.earnedAt).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "certificates" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            {profile.certificates.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">Nenhum certificado ainda. Complete um curso!</p>
            ) : (
              <div className="space-y-2">
                {profile.certificates.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
                        <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{c.courseTitle}</p>
                        <p className="text-xs text-zinc-400">
                          Emitido em {new Date(c.issuedAt).toLocaleDateString("pt-BR")} · Código: {c.code}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/certificados/${c.code}`}
                      className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Ver
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
