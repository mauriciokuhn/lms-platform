"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import type { UserSettingsData } from "@/app/api/settings/route";

// ──────────────────────────────────────────
// Defaults
// ──────────────────────────────────────────

const SETTINGS_DEFAULTS: UserSettingsData = {
  soundEnabled: true,
  soundTone: "CHIME",
  vibrationEnabled: true,
  doNotDisturb: false,
  dndStartTime: null,
  dndEndTime: null,
};

// ──────────────────────────────────────────
// DND window helper
// ──────────────────────────────────────────

function isInDNDWindow(settings: UserSettingsData): boolean {
  if (!settings.doNotDisturb || !settings.dndStartTime || !settings.dndEndTime) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const startMinutes = parseTime(settings.dndStartTime);
  const endMinutes = parseTime(settings.dndEndTime);

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

// ──────────────────────────────────────────
// Context type
// ──────────────────────────────────────────

export interface SettingsContextValue {
  settings: UserSettingsData;
  loading: boolean;
  updateSettings: (partial: Partial<UserSettingsData>) => Promise<boolean>;
  isDNDActive: boolean;
  isSoundEnabled: boolean;
  isVibrationEnabled: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// ──────────────────────────────────────────
// Provider
// ──────────────────────────────────────────

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettingsData>(SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);

    if (!session?.user) {
      setSettings(SETTINGS_DEFAULTS);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (partial: Partial<UserSettingsData>): Promise<boolean> => {
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const dndActive = isInDNDWindow(settings);
  const isSoundEnabled = settings.soundEnabled && !dndActive;
  const isVibrationEnabled = settings.vibrationEnabled && !dndActive;

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        isDNDActive: dndActive,
        isSoundEnabled,
        isVibrationEnabled,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// ──────────────────────────────────────────
// Consumer hook
// ──────────────────────────────────────────

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error(
      "useSettingsContext must be used within a <SettingsProvider>"
    );
  }
  return ctx;
}
