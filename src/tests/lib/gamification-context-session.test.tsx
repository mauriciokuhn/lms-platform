// @vitest-environment jsdom
/**
 * Session-driven tests for the gamification context
 * (src/lib/contexts/gamification-context.tsx) using @testing-library/react +
 * jsdom — the fetch paths the SSR smoke tests cannot reach: parallel
 * progress/ranking loads, defaults on failure, refresh() and refetchProgress().
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const useSessionMock = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ useSession: useSessionMock }));

import {
  GamificationProvider,
  useGamificationContext,
} from "@/lib/contexts/gamification-context";

const fetchMock = vi.fn();

const PROGRESS_RESPONSE = {
  xp: { current: 250, level: 2, nextLevelAt: 400, levelProgress: 25 },
  streak: { current: 3, longest: 5, lastActivity: null },
  badges: [
    {
      id: "b1",
      badge: "FIRST_LESSON",
      title: "Primeira Aula",
      description: null,
      icon: null,
      earnedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  recentAchievements: [],
};

const RANKING_RESPONSE = {
  ranking: [
    { rank: 1, userId: "u1", name: "Maria", email: "m@test.com", image: null, xp: 500, level: 3 },
  ],
  userRank: 1,
  totalStudents: 10,
};

function okJson(data: unknown) {
  return { ok: true, json: async () => data };
}

function Probe() {
  const { progress, ranking, loading, error, refresh, refetchProgress } =
    useGamificationContext();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="level">{progress?.xp.level ?? "-"}</span>
      <span data-testid="xp">{progress?.xp.current ?? "-"}</span>
      <span data-testid="streak">{progress?.streak.current ?? "-"}</span>
      <span data-testid="badges">{progress?.badges.length ?? "-"}</span>
      <span data-testid="userRank">{ranking?.userRank ?? "-"}</span>
      <span data-testid="total">{ranking?.totalStudents ?? "-"}</span>
      <span data-testid="error">{error ?? "none"}</span>
      <button onClick={() => void refresh()}>refresh</button>
      <button onClick={() => void refetchProgress()}>refetch</button>
    </div>
  );
}

function renderWithSession() {
  useSessionMock.mockReturnValue({
    data: { user: { id: "u1", email: "g@test.com", role: "STUDENT" } },
    status: "authenticated",
  });
  return render(
    <GamificationProvider>
      <Probe />
    </GamificationProvider>
  );
}

describe("GamificationProvider with session", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useSessionMock.mockReset();
  });

  it("loads progress and ranking in parallel on mount", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(okJson(url.includes("progress") ? PROGRESS_RESPONSE : RANKING_RESPONSE))
    );

    renderWithSession();

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(fetchMock).toHaveBeenCalledWith("/api/gamification/progress");
    expect(fetchMock).toHaveBeenCalledWith("/api/gamification/ranking");
    expect(screen.getByTestId("level").textContent).toBe("2");
    expect(screen.getByTestId("xp").textContent).toBe("250");
    expect(screen.getByTestId("streak").textContent).toBe("3");
    expect(screen.getByTestId("badges").textContent).toBe("1");
    expect(screen.getByTestId("userRank").textContent).toBe("1");
    expect(screen.getByTestId("total").textContent).toBe("10");
    expect(screen.getByTestId("error").textContent).toBe("none");
  });

  it("falls back to default progress when the progress fetch fails", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(url.includes("progress") ? { ok: false, json: async () => ({}) } : okJson(RANKING_RESPONSE))
    );

    renderWithSession();

    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    // PROGRESS_DEFAULTS: level 1, xp 0, no badges; ranking still loads.
    expect(screen.getByTestId("level").textContent).toBe("1");
    expect(screen.getByTestId("xp").textContent).toBe("0");
    expect(screen.getByTestId("badges").textContent).toBe("0");
    expect(screen.getByTestId("userRank").textContent).toBe("1");
  });

  it("sets an error message when the fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    renderWithSession();

    await waitFor(() => expect(screen.getByTestId("error").textContent).not.toBe("none"));
    expect(screen.getByTestId("error").textContent).toBe("Erro ao carregar dados de gamificação");
    expect(screen.getByTestId("level").textContent).toBe("1"); // defaults
  });

  it("refresh() re-fetches both endpoints and clears the error", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("network down")) // initial load fails
      .mockImplementation((url: string) =>
        Promise.resolve(okJson(url.includes("progress") ? PROGRESS_RESPONSE : RANKING_RESPONSE))
      );

    renderWithSession();
    await waitFor(() => expect(screen.getByTestId("error").textContent).not.toBe("none"));

    fireEvent.click(screen.getByText("refresh"));

    await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("none"));
    expect(screen.getByTestId("level").textContent).toBe("2");
  });

  it("refetchProgress() returns and applies the fresh progress data", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(okJson(url.includes("progress") ? PROGRESS_RESPONSE : RANKING_RESPONSE))
    );

    renderWithSession();
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));
    expect(screen.getByTestId("xp").textContent).toBe("250");

    // Change what the next progress fetch returns, then refetch.
    const boosted = { ...PROGRESS_RESPONSE, xp: { ...PROGRESS_RESPONSE.xp, current: 300 } };
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(okJson(url.includes("progress") ? boosted : RANKING_RESPONSE))
    );

    fireEvent.click(screen.getByText("refetch"));

    await waitFor(() => expect(screen.getByTestId("xp").textContent).toBe("300"));
  });
});
