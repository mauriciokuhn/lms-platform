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

  /** Core check against an arbitrary key (client IP, account email, ...). */
  const checkKey = async (key: string): Promise<RateLimitResult> => {
    // Redis path (persistent, multi-instance)
    const redis = await getRedisLimiter();
    if (redis) {
      try {
        return mapRedisResult(await redis.limit(key), maxRequests);
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
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      // First request or window expired
      store.set(key, { count: 1, resetAt: now + windowMs });
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
  };

  return {
    async check(request: Request): Promise<RateLimitResult> {
      return checkKey(getClientIp(request));
    },

    /** Check/increment against a custom key (e.g. a login email). */
    checkKey,

    /** Clears the in-memory buckets. Redis entries expire naturally (or per
     *  identifier via limiter.reset(ip)) — used mainly by tests. */
    clear() {
      store.clear();
    },
  };
}

// ─── Consecutive-failure lockout (per account) ─────────────
// Complements the per-account rate limiter: after FAILURE_THRESHOLD
// consecutive failed logins (no success in between), the account is locked
// for LOCKOUT_MS. A successful login resets the counter.
//
// Backed by Redis when UPSTASH_REDIS_* is configured (like the limiters
// above) so the lockout survives restarts and multiple instances;
// otherwise a per-process in-memory store is used. A Redis failure at
// runtime degrades to the in-memory fallback for 60s.
const FAILURE_THRESHOLD = 10;
const LOCKOUT_MS = 15 * 60 * 1000;
const LOCKOUT_TTL_S = Math.ceil((LOCKOUT_MS * 2) / 1000); // Redis entry TTL

export { FAILURE_THRESHOLD };

const loginFailures = new Map<string, { count: number; lockedUntil: number }>();

interface LockoutRedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { ex: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

let lockoutRedisPromise: Promise<LockoutRedisLike | null> | null = null;
let lockoutRedisDisabledUntil = 0;

async function getLockoutRedis(): Promise<LockoutRedisLike | null> {
  if (Date.now() < lockoutRedisDisabledUntil) return null;
  if (lockoutRedisPromise) return lockoutRedisPromise;

  lockoutRedisPromise = (async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    try {
      const { Redis } = await import("@upstash/redis");
      return new Redis({ url, token });
    } catch (err) {
      logger.warn("Redis unavailable for login lockout; using in-memory fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  })();

  return lockoutRedisPromise;
}

const lockoutKey = (email: string) => `lms:login-lockout:${email}`;

async function readLockout(email: string): Promise<{ count: number; lockedUntil: number } | null> {
  const redis = await getLockoutRedis();
  if (redis) {
    try {
      const raw = await redis.get(lockoutKey(email));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { count?: number; lockedUntil?: number };
      return { count: parsed.count ?? 0, lockedUntil: parsed.lockedUntil ?? 0 };
    } catch (err) {
      lockoutRedisDisabledUntil = Date.now() + 60_000;
      logger.warn("Redis lockout read failed; using in-memory fallback for 60s", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return loginFailures.get(email) ?? null;
}

async function writeLockout(email: string, entry: { count: number; lockedUntil: number }) {
  const redis = await getLockoutRedis();
  if (redis) {
    try {
      await redis.set(lockoutKey(email), JSON.stringify(entry), { ex: LOCKOUT_TTL_S });
      return;
    } catch (err) {
      lockoutRedisDisabledUntil = Date.now() + 60_000;
      logger.warn("Redis lockout write failed; using in-memory fallback for 60s", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  loginFailures.set(email, entry);
}

/** Records a failed credential attempt. Returns the lockout state. */
export async function recordLoginFailure(email: string): Promise<{
  locked: boolean;
  remainingMs: number;
}> {
  const now = Date.now();
  const entry = await readLockout(email);

  // Fresh account, or a previous lockout already expired — count anew.
  if (!entry || (entry.lockedUntil > 0 && entry.lockedUntil <= now)) {
    await writeLockout(email, { count: 1, lockedUntil: 0 });
    return { locked: false, remainingMs: 0 };
  }

  const count = entry.count + 1;
  if (count >= FAILURE_THRESHOLD) {
    await writeLockout(email, { count, lockedUntil: now + LOCKOUT_MS });
    return { locked: true, remainingMs: LOCKOUT_MS };
  }

  await writeLockout(email, { count, lockedUntil: entry.lockedUntil });
  return { locked: false, remainingMs: 0 };
}

/** Current lockout state for an account (no mutation). */
export async function checkLoginLockout(email: string): Promise<{
  locked: boolean;
  remainingMs: number;
}> {
  const entry = await readLockout(email);
  if (!entry || entry.lockedUntil <= Date.now()) {
    return { locked: false, remainingMs: 0 };
  }
  return { locked: true, remainingMs: entry.lockedUntil - Date.now() };
}

/** Consecutive failures recorded for an account (0 if none) — used by the
 *  login page to decide when the anti-bot challenge is required. */
export async function getLoginFailureCount(email: string): Promise<number> {
  const entry = await readLockout(email);
  if (!entry) return 0;
  if (entry.lockedUntil > Date.now()) return FAILURE_THRESHOLD;
  return entry.count;
}

/** A successful login clears the failure counter. */
export async function resetLoginFailures(email: string) {
  const redis = await getLockoutRedis();
  if (redis) {
    try {
      await redis.del(lockoutKey(email));
      return;
    } catch (err) {
      lockoutRedisDisabledUntil = Date.now() + 60_000;
      logger.warn("Redis lockout reset failed; using in-memory fallback for 60s", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  loginFailures.delete(email);
}

/** Test hook — clears the in-memory store (Redis entries expire naturally). */
export function clearLoginFailures() {
  loginFailures.clear();
}

// Pre-configured limiters for common scenarios
export const strictLimiter = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 });   // 5 req/min
// Per-IP spray guard: 60 credential POSTs/min from one IP. Deliberately
// generous because whole classrooms share a school NAT IP — the real
// brute-force defense is accountLoginLimiter below.
export const authLimiter = rateLimit({ maxRequests: 60, windowMs: 60 * 1000 });    // 60 req/min per IP
// Per-account brute-force guard: 5 attempts/min per email, so an attacker
// hammering ONE account is blocked even while rotating IPs (the IP guard
// above would only catch the spray across many accounts).
export const accountLoginLimiter = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 }); // 5 attempts/min per account
export const apiLimiter = rateLimit({ maxRequests: 60, windowMs: 60 * 1000 });     // 60 req/min
