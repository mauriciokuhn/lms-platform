"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  goalType: string;
  goalValue: number;
  xpReward: number;
  badgeReward: string | null;
  startsAt: string;
  endsAt: string;
  participantsCount: number;
  myProgress: number;
  myCompleted: boolean;
}

interface Clan {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  xp: number;
  level: number;
  membersCount: number;
  members: { id: string; userId: string; name: string; image: string | null; role: string }[];
  rank?: number;
}

interface WeeklyRankEntry {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  xpGained: number;
}

// ──────────────────────────────────────────
// Challenge Card
// ──────────────────────────────────────────

export function ChallengeCard({ challenge, onJoin }: { challenge: Challenge; onJoin: (id: string) => void }) {
  // eslint-disable-next-line react-hooks/purity -- countdown needs current time at render
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const progressPct = Math.min(Math.round((challenge.myProgress / challenge.goalValue) * 100), 100);

  const goalIcons: Record<string, string> = {
    LESSONS_COMPLETED: "📚",
    XP_EARNED: "⭐",
    QUIZ_SCORE: "📝",
    STREAK_DAYS: "🔥",
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm transition ${challenge.myCompleted ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30" : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{goalIcons[challenge.goalType] || "🎯"}</span>
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-white">{challenge.title}</h4>
            {challenge.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{challenge.description}</p>
            )}
          </div>
        </div>
        {challenge.myCompleted && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900 dark:text-green-300">✅ Concluído</span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>Progresso: {challenge.myProgress}/{challenge.goalValue}</span>
          <span>{progressPct}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${challenge.myCompleted ? "bg-green-500" : "bg-gradient-to-r from-amber-400 to-amber-600"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
          <span>🎯 {challenge.goalType === "LESSONS_COMPLETED" ? "Aulas" : challenge.goalType === "XP_EARNED" ? "XP" : challenge.goalType === "QUIZ_SCORE" ? "Pontos" : "Dias"}: {challenge.goalValue}</span>
          <span>👥 {challenge.participantsCount} participantes</span>
          <span>⏱ {daysLeft}d restantes</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">+{challenge.xpReward} XP</span>
          {!challenge.myCompleted && challenge.myProgress === 0 && (
            <button
              onClick={() => onJoin(challenge.id)}
              className="rounded-lg bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Participar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Clan Card
// ──────────────────────────────────────────

export function ClanCard({ clan, onJoin }: { clan: Clan; onJoin: (id: string) => void; }) {
  const leader = clan.members.find((m) => m.role === "LEADER");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{clan.icon}</span>
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-white">{clan.name}</h4>
            {clan.description && <p className="text-xs text-zinc-500 dark:text-zinc-400">{clan.description}</p>}
            <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
              {leader ? `Líder: ${leader.name}` : ""} · {clan.membersCount} membros
            </p>
          </div>
        </div>
        {clan.rank && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            #{clan.rank}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-600 text-[10px] font-bold text-white">
            {clan.level}
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{clan.xp.toLocaleString()} XP</span>
        </div>
        <button
          onClick={() => onJoin(clan.id)}
          className="rounded-lg border border-zinc-300 px-3 py-1 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Weekly Ranking
// ──────────────────────────────────────────

export function WeeklyRanking({ ranking }: { ranking: WeeklyRankEntry[] }) {
  const { data: session } = useSession();

  if (ranking.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Nenhum XP ganho esta semana. Estude para aparecer no ranking!</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">#</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Aluno</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">XP esta semana</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {ranking.map((entry) => {
            const isMe = entry.userId === session?.user?.id;
            return (
              <tr
                key={entry.userId}
                className={`transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${isMe ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
              >
                <td className="px-4 py-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    entry.rank === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                    entry.rank === 2 ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" :
                    entry.rank === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" :
                    "text-zinc-400"
                  }`}>
                    {entry.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${isMe ? "text-amber-700 dark:text-amber-400" : "text-zinc-900 dark:text-white"}`}>
                    {entry.name}
                    {isMe && <span className="ml-1 text-xs text-amber-500">(você)</span>}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                  +{entry.xpGained.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────
// Section Component
// ──────────────────────────────────────────

export function SocialSection({ className }: { className?: string }) {
  const { data: session } = useSession();
  interface PastChallenge {
    id: string;
    title: string;
    completedAt: string | null;
    xpReward: number | null;
  }

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [pastChallenges, setPastChallenges] = useState<PastChallenge[]>([]);
  const [clans, setClans] = useState<Clan[]>([]);
  const [weeklyRanking, setWeeklyRanking] = useState<WeeklyRankEntry[]>([]);
  const [weeklyInfo, setWeeklyInfo] = useState({ userRank: null as number | null, userXpGained: 0, totalParticipants: 0 });
  const [activeSocialTab, setActiveSocialTab] = useState<"weekly" | "challenges" | "clans">("weekly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    async function load() {
      try {
        const [challengesRes, clansRes, weeklyRes] = await Promise.all([
          fetch("/api/social/challenges"),
          fetch("/api/social/clans"),
          fetch("/api/social/weekly-ranking"),
        ]);

        if (challengesRes.ok) {
          const data = await challengesRes.json();
          setChallenges(data.active || []);
          setPastChallenges(data.past || []);
        }
        if (clansRes.ok) {
          const data = await clansRes.json();
          setClans(data.clans || []);
        }
        if (weeklyRes.ok) {
          const data = await weeklyRes.json();
          setWeeklyRanking(data.ranking || []);
          setWeeklyInfo({ userRank: data.userRank, userXpGained: data.userXpGained, totalParticipants: data.totalParticipants });
        }
      } catch {} finally { setLoading(false); }
    }

    load();
  }, [session]);

  async function handleJoinChallenge(challengeId: string) {
    try {
      const res = await fetch("/api/social/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });
      if (res.ok) {
        // Refresh challenges
        const challengesRes = await fetch("/api/social/challenges");
        if (challengesRes.ok) {
          const data = await challengesRes.json();
          setChallenges(data.active || []);
        }
      }
    } catch {}
  }

  async function handleJoinClan(clanId: string) {
    try {
      await fetch("/api/social/clans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", clanId }),
      });
      // Refresh
      const clansRes = await fetch("/api/social/clans");
      if (clansRes.ok) {
        const data = await clansRes.json();
        setClans(data.clans || []);
      }
    } catch {}
  }

  if (!session?.user) return null;

  return (
    <div className={className}>
      {/* Social Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
        {[
          { id: "weekly" as const, label: "Ranking Semanal", icon: "📊" },
          { id: "challenges" as const, label: "Desafios", icon: "🎯" },
          { id: "clans" as const, label: "Clans", icon: "🏰" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSocialTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeSocialTab === tab.id
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
        </div>
      ) : (
        <>
          {activeSocialTab === "weekly" && (
            <div>
              {weeklyInfo.userRank && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Sua posição: #{weeklyInfo.userRank}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">+{weeklyInfo.userXpGained} XP esta semana</p>
                    </div>
                    <span className="text-xs text-amber-500 dark:text-amber-400">{weeklyInfo.totalParticipants} participantes</span>
                  </div>
                </div>
              )}
              <WeeklyRanking ranking={weeklyRanking} />
            </div>
          )}

          {activeSocialTab === "challenges" && (
            <div className="space-y-3">
              {challenges.length === 0 && pastChallenges.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-400">Nenhum desafio ativo no momento. Volte em breve!</p>
              ) : (
                <>
                  {challenges.map((c) => (
                    <ChallengeCard key={c.id} challenge={c} onJoin={handleJoinChallenge} />
                  ))}
                  {pastChallenges.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer rounded-lg bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
                        Desafios concluídos ({pastChallenges.length})
                      </summary>
                      <div className="mt-2 space-y-2">
                        {pastChallenges.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-2 dark:bg-green-950/20">
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">{p.title}</p>
                              <p className="text-xs text-zinc-400">Concluído {p.completedAt ? new Date(p.completedAt).toLocaleDateString("pt-BR") : ""}</p>
                            </div>
                            {p.xpReward && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">+{p.xpReward} XP</span>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          )}

          {activeSocialTab === "clans" && (
            <div className="space-y-3">
              {clans.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-zinc-400">Nenhum clan ainda. Seja o primeiro a criar um!</p>
                  <button
                    onClick={async () => {
                      const name = prompt("Nome do clan:");
                      if (name) {
                        await fetch("/api/social/clans", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "create", name }),
                        });
                        const res = await fetch("/api/social/clans");
                        if (res.ok) {
                          const data = await res.json();
                          setClans(data.clans || []);
                        }
                      }
                    }}
                    className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"
                  >
                    Criar Clan
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        const name = prompt("Nome do clan:");
                        if (name) {
                          await fetch("/api/social/clans", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "create", name }),
                          });
                          const res = await fetch("/api/social/clans");
                          if (res.ok) {
                            const data = await res.json();
                            setClans(data.clans || []);
                          }
                        }
                      }}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      + Criar Clan
                    </button>
                  </div>
                  {clans.map((c) => (
                    <ClanCard key={c.id} clan={c} onJoin={handleJoinClan} />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
