"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { useGamificationContext } from "@/lib/contexts/gamification-context";

interface CelebrationProps {
  type: "xp" | "levelup" | "badge" | "streak";
  title: string;
  description?: string;
  icon?: string;
  xpGained?: number;
  onClose?: () => void;
}

function fireConfetti(type: CelebrationProps["type"]) {
  const colors =
    type === "levelup" ? ["#f59e0b", "#f97316", "#ef4444"] :
    type === "badge" ? ["#8b5cf6", "#6366f1", "#3b82f6"] :
    type === "streak" ? ["#f97316", "#fdba74", "#ffedd5"] :
    ["#22c55e", "#10b981", "#34d399"];

  const defaults = {
    spread: 60,
    ticks: 100,
    gravity: 0.7,
    decay: 0.94,
    startVelocity: 30,
    colors,
  };

  const end = Date.now() + 1200;
  const interval = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(interval);
      return;
    }
    confetti({
      ...defaults,
      particleCount: 8,
      origin: { x: Math.random(), y: Math.random() * 0.4 },
    });
  }, 100);

  return () => clearInterval(interval);
}

const iconMap: Record<string, string> = {
  xp: "⭐",
  levelup: "⬆️",
  badge: "🏆",
  streak: "🔥",
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

export function useCelebration() {
  const [celebration, setCelebration] = useState<CelebrationProps | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const { refresh } = useGamificationContext();

  const celebrate = useCallback(
    (props: CelebrationProps) => {
      setCelebration(props);
      if (cleanupRef.current) cleanupRef.current();
      cleanupRef.current = fireConfetti(props.type);

      // Auto-refresh gamification data (progress + ranking) after celebration
      refresh();
    },
    [refresh]
  );

  const closeCelebration = useCallback(() => {
    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = null;
    setCelebration(null);
  }, []);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  return { celebration, celebrate, closeCelebration };
}

export function CelebrationModal({
  type,
  title,
  description,
  icon,
  xpGained,
  onClose,
}: CelebrationProps) {
  const displayIcon = icon || iconMap[type] || "🎉";

  return (
    <AnimatePresence>
      <motion.div
        key={`celebration-${type}-${title}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          key={`celebration-modal-${type}`}
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 15, stiffness: 200 }}
          className="mx-4 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 150, delay: 0.1 }}
            className="mb-4 text-6xl"
          >
            {displayIcon}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h2>
            {description && (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            )}
            {xpGained && xpGained > 0 ? (
              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                <span>+{xpGained} XP</span>
              </div>
            ) : null}
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Continuar
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
