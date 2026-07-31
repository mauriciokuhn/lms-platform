/**
 * Simple In-Memory Rate Limiter
 *
 * Limits the number of requests from a single IP within a time window.
 * Each limiter instance has its own store, so auth limiters don't
 * interfere with API limiters.
 *
 * Usage:
 *   import { rateLimit } from "@/lib/rate-limit";
 *   const limiter = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 });
 *   const result = limiter.check(request);
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: result.error }, { status: 429 });
 *   }
 */

interface RateLimitConfig {
  maxRequests: number;  // Max requests allowed in the window
  windowMs: number;     // Time window in milliseconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // milliseconds until reset
  error?: string;
}

// ─── Cleanup ──────────────────────────────
// Track all stores for periodic cleaning
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

// ─── Factory ──────────────────────────────

export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs } = config;

  // Each limiter gets its own store so limiters don't interfere
  const store = new Map<string, { count: number; resetAt: number }>();
  allStores.add(store);

  return {
    check(request: Request): RateLimitResult {
      globalCleanup();

      // Get client IP from headers (works behind reverse proxies)
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() ||
                 request.headers.get("x-real-ip") ||
                 "anonymous";

      const now = Date.now();
      const entry = store.get(ip);

      if (!entry || entry.resetAt < now) {
        // First request or window expired
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
      }

      entry.count++;

      if (entry.count > maxRequests) {
        const resetIn = entry.resetAt - now;
        return {
          allowed: false,
          remaining: 0,
          resetIn,
          error: `Muitas requisições. Tente novamente em ${Math.ceil(resetIn / 1000)} segundos.`,
        };
      }

      return { allowed: true, remaining: maxRequests - entry.count, resetIn: entry.resetAt - now };
    },

    /** Clear all rate limit entries (useful for testing) */
    clear() {
      store.clear();
    },
  };
}

// Pre-configured limiters for common scenarios
export const strictLimiter = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 });   // 5 req/min
export const authLimiter = rateLimit({ maxRequests: 10, windowMs: 60 * 1000 });     // 10 req/min
export const apiLimiter = rateLimit({ maxRequests: 60, windowMs: 60 * 1000 });     // 60 req/min
