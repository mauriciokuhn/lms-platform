/**
 * Redis Cache Utility (Upstash)
 *
 * Provides a caching layer for API responses to reduce database load.
 * Falls back gracefully to in-memory cache when Redis is not configured.
 *
 * Usage:
 *   import { cache } from "@/lib/cache";
 *   const data = await cache.getOrSet("courses:list", () => db.course.findMany(...), 60);
 */

// ─── In-memory fallback ───────────────────
const memoryStore = new Map<string, { value: unknown; expiresAt: number }>();

// ─── Redis client (lazy init) ──────────────
let redisClient: any = null;

async function getRedis() {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null; // Redis not configured, use memory fallback
  }

  try {
    const { Redis } = await import("@upstash/redis");
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────

export const cache = {
  /**
   * Get a value from cache, or compute and store it if missing.
   * @param key Cache key (e.g. "courses:list")
   * @param fetcher Async function to compute the value
   * @param ttlSeconds Time to live in seconds (default 60)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60
  ): Promise<T> {
    // Try Redis first
    const redis = await getRedis();
    if (redis) {
      try {
        const cached = await redis.get(key);
        if (cached !== null && cached !== undefined) {
          return cached as T;
        }
      } catch {
        // Redis error, fall through
      }
    }

    // Try memory fallback
    const memEntry = memoryStore.get(key);
    if (memEntry && memEntry.expiresAt > Date.now()) {
      return memEntry.value as T;
    }

    // Compute value
    const value = await fetcher();

    // Store in Redis if available
    if (redis) {
      try {
        await redis.setex(key, ttlSeconds, value);
      } catch {
        // Ignore write errors
      }
    }

    // Always store in memory as fallback
    memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });

    return value;
  },

  /**
   * Invalidate one or more cache keys (supports wildcard: "courses:*").
   */
  async invalidate(pattern: string): Promise<void> {
    const redis = await getRedis();

    // Invalidate memory cache by prefix
    for (const key of memoryStore.keys()) {
      if (key.startsWith(pattern.replace("*", ""))) {
        memoryStore.delete(key);
      }
    }

    // Invalidate Redis by prefix
    if (redis) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch {
        // Ignore
      }
    }
  },

  /**
   * Clear all cached entries.
   */
  async clear(): Promise<void> {
    memoryStore.clear();
    const redis = await getRedis();
    if (redis) {
      try {
        await redis.flushall();
      } catch {
        // Ignore
      }
    }
  },

  /**
   * Get a single key directly (returns null if not found).
   */
  async get<T>(key: string): Promise<T | null> {
    const redis = await getRedis();
    if (redis) {
      try {
        const cached = await redis.get(key);
        if (cached !== null && cached !== undefined) return cached as T;
      } catch {}
    }

    const memEntry = memoryStore.get(key);
    if (memEntry && memEntry.expiresAt > Date.now()) {
      return memEntry.value as T;
    }

    return null;
  },

  /**
   * Set a value in cache.
   */
  async set<T>(key: string, value: T, ttlSeconds: number = 60): Promise<void> {
    const redis = await getRedis();
    if (redis) {
      try {
        await redis.setex(key, ttlSeconds, value);
      } catch {}
    }
    memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },
};
