"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useUserSettings } from "@/lib/hooks/use-user-settings";

// ──────────────────────────────────────────
// Sound tone type
// ──────────────────────────────────────────

export type SoundTone = "CHIME" | "POP" | "ALERT";

// ──────────────────────────────────────────
// Notification Sound + Vibration Hook
// ──────────────────────────────────────────

/**
 * Plays notification sound using Web Audio API (no audio files needed)
 * and triggers mobile vibration via navigator.vibrate().
 *
 * Supports 3 tones: CHIME (two-tone musical), POP (short click), ALERT (vibrato).
 * Only fires when the browser tab is in focus.
 * Includes a 500ms cooldown to prevent overlapping sounds.
 *
 * @param tone - Optional tone override. If omitted, uses the user's saved setting.
 */
export function useNotificationAlert(tone?: SoundTone) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastAlertRef = useRef(0);
  const { settings, isSoundEnabled, isVibrationEnabled } = useUserSettings();

  const effectiveTone = tone ?? settings.soundTone;

  const alert = useCallback(
    (overrideTone?: SoundTone) => {
      const playTone = overrideTone ?? effectiveTone;

      // Only play if tab is in focus
      if (typeof document !== "undefined" && document.hidden) return;

      // Cooldown: ignore if we just played within 500ms
      const now = Date.now();
      if (now - lastAlertRef.current < 500) return;
      lastAlertRef.current = now;

      // ── Vibration (always fires if enabled, regardless of tone) ──
      if (isVibrationEnabled) {
        try {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(playTone === "ALERT" ? 300 : 150);
          }
        } catch {
          // silent
        }
      }

      // ── Sound (only if sound is enabled) ──
      if (!isSoundEnabled && !overrideTone) return;

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;

        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const t = ctx.currentTime;

        switch (playTone) {
          case "CHIME":
            playChime(ctx, t);
            break;
          case "POP":
            playPop(ctx, t);
            break;
          case "ALERT":
            playAlert(ctx, t);
            break;
        }
      } catch {
        // Web Audio not supported — silent fallback
      }
    },
    [effectiveTone, isSoundEnabled, isVibrationEnabled]
  );

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  return alert;
}

// ──────────────────────────────────────────
// Tone generators
// ──────────────────────────────────────────

/** Two-tone musical chime — C6 → E6 slide + G5 echo */
function playChime(ctx: AudioContext, t: number) {
  // First tone (higher pitch, slide up)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(1047, t);
  osc1.frequency.linearRampToValueAtTime(1319, t + 0.05);
  gain1.gain.setValueAtTime(0.15, t);
  gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(t);
  osc1.stop(t + 0.12);

  // Second tone (lower, quick echo)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(784, t + 0.1);
  gain2.gain.setValueAtTime(0.12, t + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(t + 0.1);
  osc2.stop(t + 0.22);
}

/** Short pop — single click-like burst */
function playPop(ctx: AudioContext, t: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(440, t + 0.08);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.08);
}

/** Alert — more intense with vibrato effect */
function playAlert(ctx: AudioContext, t: number) {
  // Two rapid pulses with frequency modulation (vibrato)
  for (let i = 0; i < 2; i++) {
    const pulseTime = t + i * 0.15;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(660, pulseTime);
    osc.frequency.linearRampToValueAtTime(880, pulseTime + 0.05);
    osc.frequency.linearRampToValueAtTime(660, pulseTime + 0.1);
    gain.gain.setValueAtTime(0.1, pulseTime);
    gain.gain.exponentialRampToValueAtTime(0.01, pulseTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(pulseTime);
    osc.stop(pulseTime + 0.12);
  }
}

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

// ──────────────────────────────────────────
// Notification Icon Map
// ──────────────────────────────────────────

const typeIcon: Record<string, string> = {
  LESSON_COMPLETED: "✅",
  COURSE_PUBLISHED: "📢",
  ENROLLMENT_CONFIRMED: "📚",
  QUIZ_PASSED: "📝",
  CERTIFICATE_ISSUED: "🎓",
  ACHIEVEMENT_EARNED: "🏆",
  XP_GAINED: "⭐",
  ADMIN_ALERT: "🔔",
};

// ──────────────────────────────────────────
// Time formatter
// ──────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const prevCountRef = useRef(0);
  const notifyAlert = useNotificationAlert();

  // ── Fetch notifications on mount ──
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      prevCountRef.current = data.unreadCount || 0;
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetchNotifications();
  }, [session, fetchNotifications]);

  // ── SSE subscription for real-time updates ──
  useEffect(() => {
    if (!session?.user) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/events/subscribe");
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        if (event.type === "notification") {
          const payload = event.payload;
          const items: NotificationItem[] = Array.isArray(payload) ? payload : [payload];

          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newOnes = items.filter((n) => !existingIds.has(n.id));
            if (newOnes.length === 0) return prev;
            return [...newOnes, ...prev].slice(0, 50);
          });

          setUnreadCount((prev) => prev + items.length);
        }
      } catch {
        // silent
      }
    };

    es.onerror = () => {};

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [session]);

  // ── Watch unreadCount changes to trigger sound/vibration ──
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      notifyAlert();
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount, notifyAlert]);

  // ── Close dropdown on outside click ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // ── Mark as read ──
  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  }, []);

  if (!session?.user) return null;

  const hasNew = unreadCount > prevCountRef.current;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Notificações"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white animate-in zoom-in">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {hasNew && unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-[18px] w-[18px] animate-ping rounded-full bg-red-400 opacity-75" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:w-96">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Notificações
            </h3>
            <div className="flex items-center gap-2">
              <Link
                href="/configuracoes"
                className="text-xs font-medium text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Configurar
              </Link>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <span className="text-2xl">🔔</span>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Nenhuma notificação ainda
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Você receberá alertas quando houver novidades.
                </p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-3 border-b border-zinc-50 px-4 py-3 transition hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50 ${
                    !n.read ? "bg-zinc-50/50 dark:bg-zinc-800/30" : ""
                  }`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm dark:bg-zinc-800">
                    {typeIcon[n.type] || "🔔"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                      {n.message}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {timeAgo(n.createdAt)}
                      </span>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => {
                            if (!n.read) markAsRead(n.id);
                            setIsOpen(false);
                          }}
                          className="text-[10px] font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
                        >
                          Ver detalhes
                        </Link>
                      )}
                      {!n.read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="ml-auto text-[10px] text-zinc-400 opacity-0 transition hover:text-zinc-600 group-hover:opacity-100 dark:hover:text-zinc-300"
                        >
                          OK
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
