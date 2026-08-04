"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useSession } from "next-auth/react";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface XPData {
  current: number;
  level: number;
  nextLevelAt: number;
  levelProgress: number;
}

interface StreakData {
  current: number;
  longest: number;
  lastActivity: string | null;
}

interface BadgeData {
  id: string;
  badge: string;
  title: string;
  description: string | null;
  icon: string | null;
  earnedAt: string;
}

interface AchievementData {
  id: string;
  type: string;
  title: string;
  description: string | null;
  xpGained: number;
  createdAt: string;
}

export interface GamificationProgressData {
  xp: XPData;
  streak: StreakData;
  badges: BadgeData[];
  recentAchievements: AchievementData[];
}

interface RankingEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  xp: number;
  level: number;
}

export interface GamificationRankingData {
  ranking: RankingEntry[];
  userRank: number | null;
  totalStudents: number;
}

// ──────────────────────────────────────────
// Context type
// ──────────────────────────────────────────

export interface GamificationContextValue {
  progress: GamificationProgressData | null;
  ranking: GamificationRankingData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Force a refetch and return the new progress data (for celebration triggers) */
  refetchProgress: () => Promise<GamificationProgressData | null>;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

// ──────────────────────────────────────────
// Defaults
// ──────────────────────────────────────────

const PROGRESS_DEFAULTS: GamificationProgressData = {
  xp: { current: 0, level: 1, nextLevelAt: 200, levelProgress: 0 },
  streak: { current: 0, longest: 0, lastActivity: null },
  badges: [],
  recentAchievements: [],
};

// ──────────────────────────────────────────
// Provider
// ──────────────────────────────────────────

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [progress, setProgress] = useState<GamificationProgressData | null>(null);
  const [ranking, setRanking] = useState<GamificationRankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!session?.user) {
      setProgress(null);
      setRanking(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [progressRes, rankingRes] = await Promise.all([
        fetch("/api/gamification/progress"),
        fetch("/api/gamification/ranking"),
      ]);

      if (progressRes.ok) {
        const data = await progressRes.json();
        setProgress(data);
      } else {
        setProgress(PROGRESS_DEFAULTS);
      }

      if (rankingRes.ok) {
        setRanking(await rankingRes.json());
      }
    } catch (err) {
      console.error("GamificationContext fetch error:", err);
      setError("Erro ao carregar dados de gamificação");
      setProgress(PROGRESS_DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const refetchProgress = useCallback(async (): Promise<GamificationProgressData | null> => {
    try {
      const res = await fetch("/api/gamification/progress");
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
        return data;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  return (
    <GamificationContext.Provider
      value={{
        progress,
        ranking,
        loading,
        error,
        refresh,
        refetchProgress,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

// ──────────────────────────────────────────
// Consumer hook
// ──────────────────────────────────────────

export function useGamificationContext(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error(
      "useGamificationContext must be used within a <GamificationProvider>"
    );
  }
  return ctx;
}
