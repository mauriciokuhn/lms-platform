"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useGamificationContext } from "@/lib/contexts/gamification-context";
import { XPBar, StreakDisplay, BadgeCard, RankingTable, GamificationWidget } from "@/components/ui/gamification-display";
import { SocialSection } from "@/components/ui/social-gamification";
import { AnimatedPage, AnimatedCard } from "@/components/ui/animated-page";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";

export default function GamificacaoPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { progress, ranking, loading } = useGamificationContext();
  const [activeTab, setActiveTab] = useState<"progress" | "ranking" | "social">("progress");

  useEffect(() => {
    // Only redirect once the session has settled — avoids bouncing logged-in
    // users to /login while the session is still loading on hard navigation.
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading" || !session?.user) return null;

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/dashboard" className="text-lg font-bold text-zinc-900 dark:text-white">
              Ponto do Saber
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400">Dashboard</Link>
              <Link href="/perfil" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400">Perfil</Link>
              <GamificationWidget />
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">
          <AnimatedCard index={0}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-2xl shadow-md shadow-amber-500/30 ring-2 ring-amber-200/60 dark:ring-amber-900/50">
                🏆
              </div>
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Gamificação</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Acompanhe seu progresso, badges e ranking entre alunos
                </p>
              </div>
            </div>
          </AnimatedCard>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="mb-6 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
                {[
                  { id: "progress" as const, label: "Meu Progresso", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
                  { id: "ranking" as const, label: "Ranking", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
                  { id: "social" as const, label: "Social", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                      activeTab === tab.id
                        ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                    </svg>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "progress" && progress && (
                <div className="space-y-6">
                  <AnimatedCard index={1}>
                    <XPBar xp={progress.xp} />
                  </AnimatedCard>
                  <AnimatedCard index={2}>
                    <StreakDisplay streak={progress.streak} />
                  </AnimatedCard>

                  {progress.badges.length > 0 && (
                    <AnimatedCard index={3}>
                      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">Badges Conquistados</h2>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {progress.badges.map((badge) => (
                          <BadgeCard key={badge.id} badge={badge} />
                        ))}
                      </div>
                    </AnimatedCard>
                  )}

                  {ranking && ranking.totalStudents > 0 && (
                    <AnimatedCard index={4}>
                      <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-amber-900/40 dark:from-amber-950/20 dark:to-zinc-900">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Sua posição no ranking
                          </p>
                          <button
                            onClick={() => setActiveTab("ranking")}
                            className="text-sm font-medium text-zinc-900 hover:underline dark:text-white"
                          >
                            Ver ranking completo →
                          </button>
                        </div>
                        <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">
                          {ranking.userRank ? `#${ranking.userRank}` : "—"}
                        </p>
                        <p className="text-xs text-zinc-400">
                          de {ranking.totalStudents} alunos
                        </p>
                      </div>
                    </AnimatedCard>
                  )}

                  {progress.recentAchievements.length > 0 && (
                    <AnimatedCard index={5}>
                      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">Atividades Recentes</h2>
                      <div className="space-y-2">
                        {progress.recentAchievements.map((ach) => (
                          <div key={ach.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">{ach.title}</p>
                              {ach.description && <p className="text-xs text-zinc-500">{ach.description}</p>}
                            </div>
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              +{ach.xpGained} XP
                            </span>
                          </div>
                        ))}
                      </div>
                    </AnimatedCard>
                  )}
                </div>
              )}

              {activeTab === "ranking" && ranking && (
                <AnimatedCard index={1}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      Ranking de Alunos
                    </h2>
                    <span className="text-sm text-zinc-500">{ranking.totalStudents} alunos</span>
                  </div>
                  <RankingTable ranking={ranking.ranking} currentUserId={session?.user?.id} />
                </AnimatedCard>
              )}

              {activeTab === "social" && (
                <AnimatedCard index={1}>
                  <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                    Gamificação Social
                  </h2>
                  <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                    Participe de desafios semanais, entre em clans e compita no ranking semanal!
                  </p>
                  <SocialSection />
                </AnimatedCard>
              )}
            </>
          )}
        </main>
      </div>
    </AnimatedPage>
  );
}
