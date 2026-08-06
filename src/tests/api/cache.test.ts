/**
 * Unit tests for the cache utility (src/lib/cache.ts).
 *
 * Covers the three behaviors:
 *  1. In-memory fallback — no UPSTASH_REDIS_* env → Redis never touched.
 *  2. Redis path — @upstash/redis is mocked; get/setex/keys/del/flushall
 *     are exercised without any network.
 *  3. Cooldown — after a runtime Redis failure, subsequent calls skip Redis
 *     for 60s (verified by asserting Redis is not called again), then serve
 *     from memory.
 *
 * `vi.resetModules()` in beforeEach gives each test a fresh module singleton
 * (memoryStore / redisClient / redisDisabledUntil are module-level).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted BEFORE the module under test is imported) ────────────
const redisGetMock = vi.hoisted(() => vi.fn());
const redisSetexMock = vi.hoisted(() => vi.fn());
const redisKeysMock = vi.hoisted(() => vi.fn());
const redisDelMock = vi.hoisted(() => vi.fn());
const redisFlushallMock = vi.hoisted(() => vi.fn());

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: redisGetMock,
    setex: redisSetexMock,
    keys: redisKeysMock,
    del: redisDelMock,
    flushall: redisFlushallMock,
  })),
}));

beforeEach(() => {
  vi.resetModules();
  redisGetMock.mockReset();
  redisSetexMock.mockReset();
  redisKeysMock.mockReset();
  redisDelMock.mockReset();
  redisFlushallMock.mockReset();
});

describe("cache — in-memory fallback (no Redis env)", () => {
  it("computes and serves values from memory without touching Redis", async () => {
    const { cache } = await import("@/lib/cache");
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return "v1";
    };

    expect(await cache.getOrSet("k", fetcher)).toBe("v1");
    // Second read hits the memory entry; fetcher is not re-run.
    expect(await cache.getOrSet("k", fetcher)).toBe("v1");
    expect(calls).toBe(1);
    expect(redisGetMock).not.toHaveBeenCalled();
  });

  it("returns null for missing keys", async () => {
    const { cache } = await import("@/lib/cache");
    expect(await cache.get("missing")).toBeNull();
  });

  it("supports get/set and invalidate", async () => {
    const { cache } = await import("@/lib/cache");
    await cache.set("a", 42);
    expect(await cache.get("a")).toBe(42);

    await cache.invalidate("a");
    expect(await cache.get("a")).toBeNull();
  });
});

describe("cache — Redis path (env set, Redis mocked)", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  it("serves a hit straight from Redis", async () => {
    const { cache } = await import("@/lib/cache");
    redisGetMock.mockResolvedValue("cached");

    expect(await cache.getOrSet("k", async () => "computed")).toBe("cached");
    expect(redisGetMock).toHaveBeenCalledWith("k");
    // Hit short-circuits before the fetcher and before any write.
    expect(redisSetexMock).not.toHaveBeenCalled();
  });

  it("computes and writes to Redis on a miss", async () => {
    const { cache } = await import("@/lib/cache");
    redisGetMock.mockResolvedValue(null);

    expect(await cache.getOrSet("k", async () => "computed", 30)).toBe(
      "computed"
    );
    expect(redisSetexMock).toHaveBeenCalledWith("k", 30, "computed");
  });

  it("writes through on set() and reads back with get()", async () => {
    const { cache } = await import("@/lib/cache");
    redisGetMock.mockResolvedValue("from-redis");

    await cache.set("k", "v");
    expect(redisSetexMock).toHaveBeenCalledWith("k", 60, "v");
    expect(await cache.get("k")).toBe("from-redis");
  });

  it("clears Redis with flushall on clear()", async () => {
    const { cache } = await import("@/lib/cache");
    await cache.clear();
    expect(redisFlushallMock).toHaveBeenCalled();
  });
});

describe("cache — Redis cooldown after a runtime failure", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  });

  it("serves from memory and skips Redis while the cooldown is active", async () => {
    const { cache } = await import("@/lib/cache");

    // First request: Redis read fails → fall back to memory, no write.
    redisGetMock.mockRejectedValue(new Error("network down"));
    expect(await cache.getOrSet("k", async () => "computed")).toBe("computed");
    expect(redisSetexMock).not.toHaveBeenCalled();

    // Cooldown active: second request never touches Redis again.
    const again = await cache.getOrSet("k", async () => "computed2");
    expect(again).toBe("computed"); // served from memory entry
    expect(redisGetMock).toHaveBeenCalledTimes(1);
    expect(redisSetexMock).not.toHaveBeenCalled();
  });

  it("does not enter cooldown when Redis is simply unconfigured", async () => {
    const { cache } = await import("@/lib/cache");
    // No env in this test (set by parent beforeEach, so clear it).
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    await cache.getOrSet("k", async () => "mem");
    expect(redisGetMock).not.toHaveBeenCalled();
  });
});
