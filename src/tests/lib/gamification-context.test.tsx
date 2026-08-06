/**
 * Unit tests for the gamification context (src/lib/contexts/gamification-context.tsx).
 *
 * SSR smoke tests of <GamificationProvider> with no session (neutral state +
 * the render-phase reset) and the consumer hook throwing outside a provider.
 * The fetch-driven paths (progress/ranking) are exercised through the e2e
 * suite; testing them here would require jsdom + @testing-library/react.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const useSessionMock = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ useSession: useSessionMock }));

import {
  GamificationProvider,
  useGamificationContext,
} from "@/lib/contexts/gamification-context";

describe("GamificationProvider (SSR, no session)", () => {
  afterEach(() => {
    useSessionMock.mockReset();
  });

  function Probe() {
    const { progress, ranking, loading, error } = useGamificationContext();
    return (
      <div>
        {JSON.stringify({
          level: progress?.xp.level ?? null,
          badges: progress?.badges.length ?? null,
          ranking: ranking ?? null,
          loading,
          error,
        })}
      </div>
    );
  }

  it("resets to a neutral state when unauthenticated", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });

    const html = renderToStaticMarkup(
      <GamificationProvider>
        <Probe />
      </GamificationProvider>
    );

    // renderToStaticMarkup escapes quotes as &quot; — assert the escaped form.
    expect(html).toContain('&quot;level&quot;:null');
    expect(html).toContain('&quot;badges&quot;:null');
    expect(html).toContain('&quot;ranking&quot;:null');
    expect(html).toContain('&quot;loading&quot;:false');
    expect(html).toContain('&quot;error&quot;:null');
  });

  it("useGamificationContext throws outside a provider", () => {
    function Orphan() {
      useGamificationContext();
      return null;
    }

    expect(() => renderToStaticMarkup(<Orphan />)).toThrow(/must be used within/);
  });
});
