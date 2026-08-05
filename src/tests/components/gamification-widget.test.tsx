// @vitest-environment jsdom
/**
 * Session-driven tests for the header GamificationWidget
 * (src/components/ui/gamification-display.tsx). The widget is rendered
 * inside a real GamificationProvider with a mocked session + fetch, so the
 * loading state, XP/streak rendering, tooltip and the level-up glow/confetti
 * path are all exercised.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { useGamificationContext, GamificationProvider } from "@/lib/contexts/gamification-context";
import { GamificationWidget } from "@/components/ui/gamification-display";

const useSessionMock = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ useSession: useSessionMock }));

const confettiMock = vi.hoisted(() => vi.fn());
vi.mock("canvas-confetti", () => ({ default: confettiMock }));

// next/link needs a router in some Next versions — render a plain anchor.
vi.mock("next/link", () => ({
  default: (props: {
    href: string;
    children?: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react");
    const { href, children, ...rest } = props;
    return React.createElement("a", { href, ...rest }, children);
  },
}));

const fetchMock = vi.fn();

function progressAt(level: number, xp: number, streak: number) {
  return {
    xp: { current: xp, level, nextLevelAt: level === 1 ? 200 : 400, levelProgress: 25 },
    streak: { current: streak, longest: streak + 2, lastActivity: null },
    badges: [
      { id: "b1", badge: "FIRST_LESSON", title: "Primeira Aula", description: null, icon: null, earnedAt: "2026-01-01T00:00:00.000Z" },
    ],
    recentAchievements: [],
  };
}

const RANKING = {
  ranking: [{ rank: 3, userId: "u1", name: "Maria", email: "m@test.com", image: null, xp: 250, level: 2 }],
  userRank: 3,
  totalStudents: 10,
};

function okJson(data: unknown) {
  return { ok: true, json: async () => data };
}

function RefreshButton() {
  const { refresh } = useGamificationContext();
  return (
    <button data-testid="refresh" onClick={() => void refresh()}>
      refresh
    </button>
  );
}

function Harness() {
  return (
    <GamificationProvider>
      <GamificationWidget />
      <RefreshButton />
    </GamificationProvider>
  );
}

function renderWidget() {
  useSessionMock.mockReturnValue({
    data: { user: { id: "u1", email: "g@test.com", role: "STUDENT" } },
    status: "authenticated",
  });
  return render(<Harness />);
}

describe("GamificationWidget", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    confettiMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useSessionMock.mockReset();
  });

  it("renders nothing while data is loading", () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // never resolves
    renderWidget();
    expect(screen.queryByText(/Nível/)).toBeNull();
  });

  it("renders the level badge and streak once progress loads", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(okJson(url.includes("progress") ? progressAt(2, 250, 5) : RANKING))
    );

    renderWidget();

    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    expect(screen.getByText("250/400")).toBeTruthy(); // compact XP bar
    expect(screen.getByText("5")).toBeTruthy(); // streak
  });

  it("opens the tooltip with XP, streak and ranking details on click", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(okJson(url.includes("progress") ? progressAt(2, 250, 5) : RANKING))
    );

    renderWidget();
    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());

    // First button is the widget toggle; the second is the test refresh button.
    fireEvent.click(screen.getAllByRole("button")[0]);

    await waitFor(() => expect(screen.getByText("Nível 2")).toBeTruthy());
    expect(screen.getByText("250 XP")).toBeTruthy();
    expect(screen.getByText("250 / 400 XP para o próximo nível")).toBeTruthy();
    expect(screen.getByText("5 dias")).toBeTruthy();
    expect(screen.getByText("#3 de 10")).toBeTruthy();
    expect(screen.getByText("Ver detalhes completos →")).toBeTruthy();
  });

  it("triggers the level-up glow and mini confetti when the level increases", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(okJson(url.includes("progress") ? progressAt(1, 100, 3) : RANKING))
    );

    renderWidget();
    await waitFor(() => expect(screen.getByText("1")).toBeTruthy());

    // Simulate a level-up: the next progress fetch returns level 2.
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(okJson(url.includes("progress") ? progressAt(2, 250, 5) : RANKING))
    );

    fireEvent.click(screen.getByTestId("refresh"));

    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    await waitFor(() =>
      expect(document.querySelector(".level-up-glow")).not.toBeNull()
    );
    await waitFor(() => expect(confettiMock).toHaveBeenCalled());
  });

  it("does not trigger level-up when the level stays the same", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(okJson(url.includes("progress") ? progressAt(1, 100, 3) : RANKING))
    );

    renderWidget();
    await waitFor(() => expect(screen.getByText("1")).toBeTruthy());

    // Same level after refresh — just more XP.
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(okJson(url.includes("progress") ? progressAt(1, 150, 3) : RANKING))
    );

    fireEvent.click(screen.getByTestId("refresh"));

    await waitFor(() => expect(screen.getByText("150/200")).toBeTruthy());
    expect(document.querySelector(".level-up-glow")).toBeNull();
    expect(confettiMock).not.toHaveBeenCalled();
  });
});
