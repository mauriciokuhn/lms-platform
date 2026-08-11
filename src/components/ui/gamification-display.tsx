"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGamificationContext } from "@/lib/contexts/gamification-context";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";

interface XPData {
  current: number;
  level: number;
  nextLevelAt: number;
  levelProgress: number;
}

interface StreakData {
  current: number;
  longest: number;
}

interface BadgeData {
  id: string;
  badge: string;
  title: string;
  description: string | null;
  icon: string | null;
  earnedAt: string;
}

// ──────────────────────────────────────────
// XP BAR
// ──────────────────────────────────────────

export function XPBar({ xp }: { xp: XPData }) {
  return (
    <div className="rounded-xl border border-amber-200/70 bg-white p-4 shadow-sm shadow-amber-500/5 dark:border-amber-900/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-white">
            {xp.level}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Nível {xp.level}</p>
            <p className="text-xs text-zinc-500">{xp.current} / {xp.nextLevelAt} XP</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-zinc-900">{xp.current}</p>
          <p className="text-xs text-zinc-400">XP total</p>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${xp.levelProgress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// STREAK DISPLAY
// ──────────────────────────────────────────

export function StreakDisplay({ streak }: { streak: StreakData }) {
  return (
    <div className="rounded-xl border border-amber-200/70 bg-white p-4 shadow-sm shadow-amber-500/5 dark:border-amber-900/40">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
          <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
          </svg>
        </div>
        <div>
          <p className="text-2xl font-bold text-zinc-900">{streak.current}</p>
          <p className="text-xs text-zinc-500">dias de streak</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm text-zinc-500">Recorde</p>
          <p className="text-lg font-semibold text-zinc-900">{streak.longest}</p>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// BADGE DISPLAY
// ──────────────────────────────────────────

const badgeIcons: Record<string, string> = {
  FIRST_LESSON: "🎯",
  FAST_LEARNER: "⚡",
  TOP_SCORE: "🏆",
  STREAK_3: "🔥",
  STREAK_7: "🔥",
  STREAK_30: "🔥",
  COURSE_COMPLETE: "🎓",
  PERFECT_QUIZ: "💯",
  SOCIAL_BUTTERFLY: "🦋",
  EARLY_ADOPTER: "🌟",
};

export function BadgeCard({ badge }: { badge: BadgeData }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 text-lg">
        {badgeIcons[badge.badge] || "🏅"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900">{badge.title}</p>
        {badge.description && (
          <p className="truncate text-xs text-zinc-500">{badge.description}</p>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// RANKING TABLE
// ──────────────────────────────────────────

interface RankingEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  xp: number;
  level: number;
}

// ──────────────────────────────────────────
// HEADER WIDGET
// ──────────────────────────────────────────

export function GamificationWidget() {
  const { progress, ranking, loading } = useGamificationContext();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevLevelRef = useRef<number | null>(null);
  const confettiFiredRef = useRef(false);

  // Close tooltip on click outside
  useEffect(() => {
    if (!tooltipOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setTooltipOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tooltipOpen]);

  // ── Level-up detection & animation ──
  useEffect(() => {
    if (loading || !progress) return;

    const currentLevel = progress.xp.level;
    const prevLevel = prevLevelRef.current;

    // Update ref unconditionally so it never gets stuck
    prevLevelRef.current = currentLevel;

    if (prevLevel !== null && currentLevel > prevLevel) {
      // LEVEL UP! 🎉
      setLevelUp(true);
      confettiFiredRef.current = false;

      // Remove glow after animation completes (3 × 1.2s glow + 0.2s buffer)
      const timer = setTimeout(() => setLevelUp(false), 3800);

      return () => clearTimeout(timer);
    }
  }, [progress, loading]);

  // ── Mini confetti burst on level up ──
  const fireMiniConfetti = useCallback(() => {
    if (!ref.current || confettiFiredRef.current) return;
    confettiFiredRef.current = true;

    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = cx / window.innerWidth;
    const y = cy / window.innerHeight;

    // Burst 1: golden sparkles
    confetti({
      particleCount: 30,
      spread: 80,
      origin: { x, y },
      colors: ["#f59e0b", "#f97316", "#fbbf24", "#fef3c7", "#ffffff"],
      ticks: 80,
      gravity: 0.6,
      scalar: 0.8,
      startVelocity: 25,
    });

    // Burst 2 (delayed): smaller secondary sparkles
    setTimeout(() => {
      confetti({
        particleCount: 15,
        spread: 45,
        origin: { x, y },
        colors: ["#f59e0b", "#fbbf24"],
        ticks: 60,
        gravity: 0.4,
        scalar: 0.5,
        startVelocity: 15,
      });
    }, 150);
  }, []);

  // Fire confetti when levelUp state becomes true
  useEffect(() => {
    if (levelUp) {
      fireMiniConfetti();
    }
  }, [levelUp, fireMiniConfetti]);

  if (loading || !progress) return null;

  const { xp, streak } = progress;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setTooltipOpen(!tooltipOpen)}
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${
          levelUp
            ? "bg-amber-50 dark:bg-amber-950/40"
            : "hover:bg-amber-50 dark:hover:bg-amber-950/40"
        }`}
      >
        {/* Level badge */}
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-600 text-[10px] font-bold text-white ${
            levelUp ? "level-up-glow" : "shadow-sm"
          }`}
        >
          {xp.level}
        </div>
        {/* XP compact bar */}
        <div className="hidden w-16 sm:block">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xp.levelProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
            />
          </div>
          <p className="mt-0.5 text-[10px] text-zinc-400">{xp.current}/{xp.nextLevelAt}</p>
        </div>
        {/* Streak */}
        <div className="flex items-center gap-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
          <span>{streak.current}</span>
        </div>
      </button>

      {/* Tooltip */}
      {tooltipOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 max-[420px]:right-auto max-[420px]:left-0">
          <div className="relative overflow-hidden rounded-xl border border-amber-200/70 bg-white p-4 shadow-xl dark:border-amber-900/40 dark:bg-zinc-900">
            {/* Brand accent: amber gradient top strip */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">Nível {xp.level}</span>
              <span className="text-xs text-zinc-400">{xp.current} XP</span>
            </div>
            <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xp.levelProgress}%` }}
                transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
              />
            </div>
            <p className="mb-3 text-[11px] text-zinc-400">
              {xp.current} / {xp.nextLevelAt} XP para o próximo nível
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <svg className="h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                  Streak atual
                </span>
                <span className="font-semibold text-zinc-900 dark:text-white">{streak.current} dias</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  🏆 Recorde
                </span>
                <span className="font-semibold text-zinc-900 dark:text-white">{streak.longest} dias</span>
              </div>
              {progress.badges.length > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    🏅 Badges
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{progress.badges.length}</span>
                </div>
              )}
              {ranking?.userRank && (
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                    📊 Ranking
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    #{ranking.userRank} de {ranking.totalStudents}
                  </span>
                </div>
              )}
            </div>

            <Link
              href="/gamificacao"
              className="mt-3 block rounded-lg bg-amber-50 px-3 py-1.5 text-center text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/40"
              onClick={() => setTooltipOpen(false)}
            >
              Ver detalhes completos →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function RankingTable({
  ranking,
  currentUserId,
}: {
  ranking: RankingEntry[];
  currentUserId?: string;
}) {
  return (      <div className="relative overflow-hidden rounded-xl border border-amber-200/60 bg-white shadow-sm dark:border-amber-900/40">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
              Aluno
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
              Nível
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
              XP
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {ranking.map((entry) => {
            const isMe = entry.userId === currentUserId;
            return (
              <tr
                key={entry.userId}
                className={cn(
                  "transition hover:bg-zinc-50",
                  isMe && "bg-amber-50/50"
                )}
              >
                <td className="px-4 py-3">
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    entry.rank === 1 ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm" :
                    entry.rank === 2 ? "bg-zinc-100 text-zinc-600" :
                    entry.rank === 3 ? "bg-orange-100 text-orange-700" :
                    "text-zinc-400"
                  )}>
                    {entry.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "text-sm font-medium",
                    isMe ? "text-amber-700" : "text-zinc-900"
                  )}>
                    {entry.name}
                    {isMe && <span className="ml-1 text-xs text-amber-500">(você)</span>}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-zinc-500">
                  {entry.level}
                </td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">
                  {entry.xp.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
