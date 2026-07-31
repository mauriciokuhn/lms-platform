"use client";

import { useSettingsContext } from "@/lib/contexts/settings-context";

/**
 * Hook to access user notification settings.
 *
 * Now powered by SettingsContext (single fetch in Provider, no custom events).
 * Re-exported for backward-compatibility so existing imports keep working.
 */
export function useUserSettings() {
  return useSettingsContext();
}
