// @vitest-environment jsdom
/**
 * Component tests for the reusable UI pieces that make up the course cards
 * and the gamification panels: StarRating, RatingDistribution, TopRatedBadge,
 * XPBar, StreakDisplay, BadgeCard and RankingTable.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import {
  StarRating,
  RatingDistribution,
} from "@/components/ui/star-rating";
import { TopRatedBadge } from "@/components/ui/top-rated-badge";
import {
  XPBar,
  StreakDisplay,
  BadgeCard,
  RankingTable,
} from "@/components/ui/gamification-display";

// ── StarRating ──────────────────────────────────────────────────────────

describe("StarRating", () => {
  it("renders five stars and fills the rated ones", () => {
    const { container } = render(<StarRating rating={4} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(5);
    // Buttons 1..4 filled (amber-400), button 5 empty (zinc-200).
    expect(buttons[3].querySelector("svg")?.getAttribute("class")).toContain("text-amber-400");
    expect(buttons[4].querySelector("svg")?.getAttribute("class")).toContain("text-zinc-200");
  });

  it("renders a half-filled star between 0.25 and 0.75 of the next star", () => {
    const { container } = render(<StarRating rating={3.5} />);
    const buttons = container.querySelectorAll("button");
    // Star 4 is the ceil of 3.5 with a .5 fraction → half (amber-300).
    expect(buttons[3].querySelector("svg")?.getAttribute("class")).toContain("text-amber-300");
  });

  it("does not render a half star below the 0.25 threshold", () => {
    const { container } = render(<StarRating rating={3.2} />);
    const buttons = container.querySelectorAll("button");
    // ceil(3.2) = 4, fraction .2 < .25 → not half, not filled.
    expect(buttons[3].querySelector("svg")?.getAttribute("class")).toContain("text-zinc-200");
  });

  it("shows the numeric value and review count", () => {
    render(<StarRating rating={4.2} showValue totalReviews={3} />);
    expect(screen.getByText("4.2")).toBeTruthy();
    expect(screen.getByText("(3 avaliações)")).toBeTruthy();
  });

  it("uses singular for a single review", () => {
    render(<StarRating rating={5} totalReviews={1} />);
    expect(screen.getByText("(1 avaliação)")).toBeTruthy();
  });

  it("is read-only by default (buttons disabled)", () => {
    const { container } = render(<StarRating rating={3} />);
    container.querySelectorAll("button").forEach((b) => {
      expect((b as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it("fires onChange with the clicked star in interactive mode", () => {
    const onChange = vi.fn();
    render(<StarRating rating={0} interactive onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("5 estrelas"));
    expect(onChange).toHaveBeenCalledWith(5);
  });
});

// ── RatingDistribution ───────────────────────────────────────────────────

describe("RatingDistribution", () => {
  it("renders bars with the correct counts and percentages", () => {
    render(
      <RatingDistribution
        distribution={{ 5: 4, 4: 1, 3: 0, 2: 0, 1: 0 }}
        totalReviews={5}
      />
    );

    // Tooltip text embeds count + percentage.
    expect(screen.getByText("4 avaliações (80%)")).toBeTruthy();
    expect(screen.getByText("1 avaliação (20%)")).toBeTruthy();
  });

  it("renders zero-width bars when there are no reviews", () => {
    const { container } = render(
      <RatingDistribution distribution={{}} totalReviews={0} />
    );
    // Every row shows 0 avaliações (0%) and a zero-width fill bar.
    expect(screen.getAllByText("0 avaliações (0%)")).toHaveLength(5);
    const fills = container.querySelectorAll("div[class*='bg-amber-400']");
    expect(fills).toHaveLength(5);
    fills.forEach((fill) => {
      expect((fill as HTMLElement).style.width).toBe("0%");
    });
  });
});

// ── TopRatedBadge ────────────────────────────────────────────────────────

describe("TopRatedBadge", () => {
  it("renders the 'Melhor Avaliado' label", () => {
    render(<TopRatedBadge />);
    expect(screen.getByText("Melhor Avaliado")).toBeTruthy();
  });
});

// ── XPBar ────────────────────────────────────────────────────────────────

describe("XPBar", () => {
  it("renders the level, XP progress and totals", () => {
    render(
      <XPBar
        xp={{ current: 250, level: 3, nextLevelAt: 400, levelProgress: 25 }}
      />
    );
    expect(screen.getByText("Nível 3")).toBeTruthy();
    expect(screen.getByText("250 / 400 XP")).toBeTruthy();
    expect(screen.getByText("250")).toBeTruthy();
    expect(screen.getByText("XP total")).toBeTruthy();
  });
});

// ── StreakDisplay ────────────────────────────────────────────────────────

describe("StreakDisplay", () => {
  it("renders current and record streak", () => {
    render(<StreakDisplay streak={{ current: 5, longest: 12 }} />);
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("Recorde")).toBeTruthy();
    expect(screen.getByText("dias de streak")).toBeTruthy();
  });
});

// ── BadgeCard ────────────────────────────────────────────────────────────

describe("BadgeCard", () => {
  const base = {
    id: "b1",
    badge: "FIRST_LESSON",
    title: "Primeira Aula",
    description: "Completou a primeira aula",
    icon: null,
    earnedAt: "2026-01-01T00:00:00.000Z",
  };

  it("renders title, description and the mapped emoji", () => {
    const { container } = render(<BadgeCard badge={base} />);
    expect(screen.getByText("Primeira Aula")).toBeTruthy();
    expect(screen.getByText("Completou a primeira aula")).toBeTruthy();
    expect(container.textContent).toContain("🎯");
  });

  it("falls back to 🏅 for unknown badge types and omits missing description", () => {
    const { container } = render(
      <BadgeCard badge={{ ...base, badge: "MYSTERY_BADGE", description: null }} />
    );
    expect(container.textContent).toContain("🏅");
    expect(screen.queryByText("Completou a primeira aula")).toBeNull();
  });
});

// ── RankingTable ─────────────────────────────────────────────────────────

describe("RankingTable", () => {
  const ranking = [
    { rank: 1, userId: "u1", name: "Maria", email: "m@test.com", image: null, xp: 1500, level: 5 },
    { rank: 2, userId: "u2", name: "João", email: "j@test.com", image: null, xp: 900, level: 4 },
  ];

  it("renders the entries and highlights the current user", () => {
    render(<RankingTable ranking={ranking} currentUserId="u2" />);

    expect(screen.getByText("Maria")).toBeTruthy();
    expect(screen.getByText("João")).toBeTruthy();

    const joaoRow = screen.getByText("João").closest("tr")!;
    expect(within(joaoRow).getByText("(você)")).toBeTruthy();
  });

  it("formats XP with thousand separators", () => {
    render(<RankingTable ranking={ranking} />);
    // toLocaleString output varies by locale (1.500 vs 1,500) — match either.
    expect(screen.getAllByText(/1[.,]?500/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/9[.,]?00/).length).toBeGreaterThan(0);
  });

  it("does not mark any row when currentUserId is not provided", () => {
    render(<RankingTable ranking={ranking} />);
    expect(screen.queryByText("(você)")).toBeNull();
  });
});
