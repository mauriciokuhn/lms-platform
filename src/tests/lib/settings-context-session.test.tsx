// @vitest-environment jsdom
/**
 * Session-driven tests for the settings context (src/lib/contexts/settings-context.tsx)
 * using @testing-library/react + jsdom — the paths the SSR smoke tests cannot
 * reach: the /api/settings fetch on mount, the PATCH updateSettings flow and
 * the derived sound/vibration flags while a session is active.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const useSessionMock = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ useSession: useSessionMock }));

import {
  SettingsProvider,
  useSettingsContext,
} from "@/lib/contexts/settings-context";

const fetchMock = vi.fn();

const DEFAULTS_RESPONSE = {
  soundEnabled: true,
  soundTone: "CHIME",
  vibrationEnabled: true,
  doNotDisturb: false,
  dndStartTime: null,
  dndEndTime: null,
};

function Probe() {
  const {
    settings,
    loading,
    isSoundEnabled,
    isVibrationEnabled,
    isDNDActive,
    updateSettings,
  } = useSettingsContext();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="tone">{settings.soundTone}</span>
      <span data-testid="dnd">{settings.doNotDisturb ? "on" : "off"}</span>
      <span data-testid="sound">{String(isSoundEnabled)}</span>
      <span data-testid="vibrate">{String(isVibrationEnabled)}</span>
      <span data-testid="dndactive">{String(isDNDActive)}</span>
      <button onClick={() => void updateSettings({ soundTone: "POP", doNotDisturb: true })}>
        apply
      </button>
    </div>
  );
}

function renderWithSession() {
  useSessionMock.mockReturnValue({
    data: { user: { id: "u1", email: "s@test.com", role: "STUDENT" } },
    status: "authenticated",
  });
  return render(
    <SettingsProvider>
      <Probe />
    </SettingsProvider>
  );
}

describe("SettingsProvider with session", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useSessionMock.mockReset();
  });

  it("loads settings from /api/settings on mount", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...DEFAULTS_RESPONSE,
        soundTone: "POP",
        vibrationEnabled: false,
      }),
    });

    renderWithSession();

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(fetchMock).toHaveBeenCalledWith("/api/settings");
    expect(screen.getByTestId("tone").textContent).toBe("POP");
    expect(screen.getByTestId("vibrate").textContent).toBe("false");
    expect(screen.getByTestId("sound").textContent).toBe("true");
  });

  it("keeps defaults and clears loading when the fetch fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });

    renderWithSession();

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("tone").textContent).toBe("CHIME");
    expect(screen.getByTestId("dnd").textContent).toBe("off");
  });

  it("PATCHes partial updates through updateSettings and applies the response", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => DEFAULTS_RESPONSE })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...DEFAULTS_RESPONSE, soundTone: "POP", doNotDisturb: true }),
      });

    renderWithSession();
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    fireEvent.click(screen.getByText("apply"));

    await waitFor(() => expect(screen.getByTestId("tone").textContent).toBe("POP"));
    expect(screen.getByTestId("dnd").textContent).toBe("on");

    const patchCall = fetchMock.mock.calls.find((c) => c[1]?.method === "PATCH");
    expect(patchCall).toBeTruthy();
    expect(patchCall?.[0]).toBe("/api/settings");
    const body = JSON.parse(String((patchCall?.[1] as RequestInit)?.body));
    expect(body).toEqual({ soundTone: "POP", doNotDisturb: true });
  });

  it("does not fetch anything without a session", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });

    render(
      <SettingsProvider>
        <Probe />
      </SettingsProvider>
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
