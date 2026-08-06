/**
 * Unit tests for the settings context (src/lib/contexts/settings-context.tsx).
 *
 * - isInDNDWindow: pure DND-window helper (same-day and overnight windows,
 *   boundaries, missing/invalid times) driven by fake timers.
 * - SSR smoke tests of <SettingsProvider> with no session (defaults + the
 *   render-phase reset) and the consumer hook throwing outside a provider.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const useSessionMock = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ useSession: useSessionMock }));

import {
  SettingsProvider,
  useSettingsContext,
  isInDNDWindow,
} from "@/lib/contexts/settings-context";
import type { UserSettingsData } from "@/app/api/settings/route";

const fullSettings = (overrides: Partial<UserSettingsData> = {}): UserSettingsData => ({
  soundEnabled: true,
  soundTone: "CHIME",
  vibrationEnabled: true,
  doNotDisturb: false,
  dndStartTime: null,
  dndEndTime: null,
  ...overrides,
});

describe("isInDNDWindow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    useSessionMock.mockReset();
  });

  const at = (h: number, m = 0) => {
    vi.setSystemTime(new Date(2026, 0, 15, h, m));
  };

  it("returns false when DND is disabled", () => {
    at(11, 0);
    const settings = fullSettings({
      doNotDisturb: false,
      dndStartTime: "10:00",
      dndEndTime: "12:00",
    });
    expect(isInDNDWindow(settings)).toBe(false);
  });

  it("returns false when the window is incomplete", () => {
    at(11, 0);
    expect(isInDNDWindow(fullSettings({ doNotDisturb: true }))).toBe(false);
    expect(
      isInDNDWindow(fullSettings({ doNotDisturb: true, dndStartTime: "10:00" }))
    ).toBe(false);
    expect(
      isInDNDWindow(fullSettings({ doNotDisturb: true, dndEndTime: "12:00" }))
    ).toBe(false);
  });

  it("is true inside a same-day window (start inclusive)", () => {
    const settings = fullSettings({
      doNotDisturb: true,
      dndStartTime: "10:00",
      dndEndTime: "12:00",
    });
    at(10, 0);
    expect(isInDNDWindow(settings)).toBe(true);
    at(10, 30);
    expect(isInDNDWindow(settings)).toBe(true);
    at(11, 59);
    expect(isInDNDWindow(settings)).toBe(true);
  });

  it("is false before the window starts and at/after the end (end exclusive)", () => {
    const settings = fullSettings({
      doNotDisturb: true,
      dndStartTime: "10:00",
      dndEndTime: "12:00",
    });
    at(9, 59);
    expect(isInDNDWindow(settings)).toBe(false);
    at(12, 0);
    expect(isInDNDWindow(settings)).toBe(false);
    at(13, 0);
    expect(isInDNDWindow(settings)).toBe(false);
  });

  it("handles an overnight window (22:00–07:00)", () => {
    const settings = fullSettings({
      doNotDisturb: true,
      dndStartTime: "22:00",
      dndEndTime: "07:00",
    });
    at(22, 0);
    expect(isInDNDWindow(settings)).toBe(true);
    at(23, 30);
    expect(isInDNDWindow(settings)).toBe(true);
    at(3, 0);
    expect(isInDNDWindow(settings)).toBe(true);
    at(6, 59);
    expect(isInDNDWindow(settings)).toBe(true);
    at(7, 0);
    expect(isInDNDWindow(settings)).toBe(false);
    at(12, 0);
    expect(isInDNDWindow(settings)).toBe(false);
    at(21, 59);
    expect(isInDNDWindow(settings)).toBe(false);
  });

  it("returns false for invalid time strings", () => {
    at(12, 0);
    const settings = fullSettings({
      doNotDisturb: true,
      dndStartTime: "abc",
      dndEndTime: "def",
    });
    expect(isInDNDWindow(settings)).toBe(false);
  });

  it("returns false when only one time is malformed (no silent DND)", () => {
    at(10, 0);
    // Invalid start + valid end must NOT fall into the overnight branch
    // and silently activate DND until the end time.
    expect(
      isInDNDWindow(
        fullSettings({ doNotDisturb: true, dndStartTime: "abc", dndEndTime: "12:00" })
      )
    ).toBe(false);
    expect(
      isInDNDWindow(
        fullSettings({ doNotDisturb: true, dndStartTime: "10:00", dndEndTime: "def" })
      )
    ).toBe(false);
  });
});

describe("SettingsProvider (SSR, no session)", () => {
  afterEach(() => {
    useSessionMock.mockReset();
  });

  function Probe() {
    const { settings, loading, isSoundEnabled, isVibrationEnabled, isDNDActive } =
      useSettingsContext();
    return (
      <div>
        {JSON.stringify({
          soundEnabled: settings.soundEnabled,
          loading,
          isSoundEnabled,
          isVibrationEnabled,
          isDNDActive,
        })}
      </div>
    );
  }

  it("renders defaults and clears the loading flag when unauthenticated", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });

    const html = renderToStaticMarkup(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>
    );

    // renderToStaticMarkup escapes quotes as &quot; — assert the escaped form.
    expect(html).toContain('&quot;soundEnabled&quot;:true');
    expect(html).toContain('&quot;loading&quot;:false');
    expect(html).toContain('&quot;isSoundEnabled&quot;:true');
    expect(html).toContain('&quot;isVibrationEnabled&quot;:true');
    expect(html).toContain('&quot;isDNDActive&quot;:false');
  });

  it("useSettingsContext throws outside a provider", () => {
    function Orphan() {
      useSettingsContext();
      return null;
    }

    expect(() => renderToStaticMarkup(<Orphan />)).toThrow(/must be used within/);
  });
});
