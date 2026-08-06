/**
 * Rate Limiter — Upstash Redis with in-memory fallback
 *
 * Limits the number of requests from a single IP within a time window.
 * - When UPSTASH_REDIS_REST_URL/TOKEN are configured, buckets live in Redis
 *   (@upstash/ratelimit sliding window), so limits persist across server
 *   restarts and multiple instances (Vercel serverless, containers).
 * - Otherwise (local dev, tests) a per-process in-memory store is used.
 * - If a Redis call fails at runtime, the request is served by the in-memory
 *   fallback so rate limiting degrades gracefully instead of blocking traffic.
 *
 * Usage:
 *   import { rateLimit } from "@/lib/rate-limit";
 *   const limiter = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 });
 *   const result = await limiter.check(request);
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: result.error }, { status: 429, headers: result.headers });
 *   }
 */

import { logger } from "@/lib/logger";
import type { Duration } from "@upstash/ratelimit";

interface RateLimitConfig {
  maxRequests: number; // Max requests allowed in the window
  windowMs: number;    // Time window in milliseconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // milliseconds until reset
  error?: string;
  /** Standard X-RateLimit-* headers to attach to the HTTP response. */
  headers: Record<string, string>;
}

// ─── Cleanup (in-memory fallback) ─────────────────
const allStores = new Set<Map<string, { count: number; resetAt: number }>>();
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function globalCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const store of allStores) {
    for (const [key, value] of store) {
      if (value.resetAt < now) {
        store.delete(key);
      }
    }
  }
}

// ─── Shared helpers ────────────────────────────────

/** Extracts the client IP, honoring proxies (x-forwarded-for first hop). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

function buildHeaders(
  maxRequests: number,
  remaining: number,
  resetInMs: number
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(maxRequests),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Reset": String(Math.max(0, Math.ceil(resetInMs / 1000))),
  };
}

/** Formats a window in milliseconds as an Upstash duration string ("60 s"). */
export function msToDuration(windowMs: number): Duration {
  return `${Math.max(1, Math.round(windowMs / 1000))} s`;
}

/** Shape of the object returned by @upstash/ratelimit's limit(). */
export interface RedisLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp (ms) when the limit resets
}

interface RedisRatelimitLike {
  limit(identifier: string): Promise<RedisLimitResult>;
}

/** Maps an @upstash/ratelimit result into the app's RateLimitResult shape. */
export function mapRedisResult(
  result: RedisLimitResult,
  maxRequests: number,
  now: number = Date.now()
): RateLimitResult {
  const resetIn = Math.max(0, result.reset - now);
  const remaining = result.success ? result.remaining : 0;
  return {
    allowed: result.success,
    remaining,
    resetIn,
    ...(result.success
      ? {}
      : {
          error: `Muitas requisições. Tente novamente em ${Math.max(1, Math.ceil(resetIn / 1000))} segundos.`,
        }),
    headers: buildHeaders(maxRequests, remaining, resetIn),
  };
}

// ─── Factory ──────────────────────────────────────

export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs } = config;

  // In-memory store (fallback when Redis is not configured/unreachable)
  const store = new Map<string, { count: number; resetAt: number }>();
  allStores.add(store);

  // Lazily-built Upstash limiter, cached per factory instance.
  let redisLimiterPromise: Promise<RedisRatelimitLike | null> | null = null;
  // Cooldown after a runtime Redis failure: skip Redis for 60s to avoid
  // per-request latency and log spam while the store is down, then re-probe.
  let redisDisabledUntil = 0;

  function getRedisLimiter(): Promise<RedisRatelimitLike | null> {
    if (Date.now() < redisDisabledUntil) return Promise.resolve(null);
    if (redisLimiterPromise) return redisLimiterPromise;

    redisLimiterPromise = (async () => {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (!url || !token) return null;

      try {
        const [{ Ratelimit }, { Redis }] = await Promise.all([
          import("@upstash/ratelimit"),
          import("@upstash/redis"),
        ]);
        return new Ratelimit({
          redis: new Redis({ url, token }),
          limiter: Ratelimit.slidingWindow(maxRequests, msToDuration(windowMs)),
          prefix: `lms:ratelimit:${maxRequests}:${windowMs}`,
          ephemeralCache: new Map(),
        });
      } catch (err) {
        logger.warn("Redis rate limiter unavailable, using in-memory fallback", {
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    })();

    return redisLimiterPromise;
  }

  return {
    async check(request: Request): Promise<RateLimitResult> {
      const ip = getClientIp(request);

      // Redis path (persistent, multi-instance)
      const redis = await getRedisLimiter();
      if (redis) {
        try {
          return mapRedisResult(await redis.limit(ip), maxRequests);
        } catch (err) {
          // Disable Redis briefly so the outage doesn't add latency or
          // spam warnings on every request; memory serves in the meantime.
          redisDisabledUntil = Date.now() + 60_000;
          logger.warn("Redis rate limit check failed; using in-memory fallback for 60s", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // In-memory path (fallback)
      globalCleanup();

      const now = Date.now();
      const entry = store.get(ip);

      if (!entry || entry.resetAt < now) {
        // First request or window expired
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetIn: windowMs,
          headers: buildHeaders(maxRequests, maxRequests - 1, windowMs),
        };
      }

      entry.count++;

      if (entry.count > maxRequests) {
        const resetIn = entry.resetAt - now;
        return {
          allowed: false,
          remaining: 0,
          resetIn,
          error: `Muitas requisições. Tente novamente em ${Math.ceil(resetIn / 1000)} segundos.`,
          headers: buildHeaders(maxRequests, 0, resetIn),
        };
      }

      return {
        allowed: true,
        remaining: maxRequests - entry.count,
        resetIn: entry.resetAt - now,
        headers: buildHeaders(
          maxRequests,
          maxRequests - entry.count,
          entry.resetAt - now
        ),
      };
    },

    /** Clears the in-memory buckets. Redis entries expire naturally (or per
     *  identifier via limiter.reset(ip)) — used mainly by tests. */
    clear() {
      store.clear();
    },
  };
}

// Pre-configured limiters for common scenarios
export const strictLimiter = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 });   // 5 req/min
export const authLimiter = rateLimit({ maxRequests: 10, windowMs: 60 * 1000 });    // 10 req/min
export const apiLimiter = rateLimit({ maxRequests: 60, windowMs: 60 * 1000 });     // 60 req/min
