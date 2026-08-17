/**
 * Login audit — detects logins from a new network/device.
 *
 * On each successful credential login we record a hash of the client IP
 * against the account. When a later successful login comes from a different
 * IP (and we have history), the auth wrapper emails the owner a heads-up.
 *
 * IPs are stored as SHA-256 hashes (never the raw address) with a 30-day TTL,
 * so a "new IP" here means "an IP this account hasn't logged in from in the
 * last 30 days". Backed by Redis (UPSTASH_REDIS_*) like the lockout store,
 * with an in-memory fallback for dev/tests/Redis outages.
 */

import { createHash } from "crypto";
import { logger } from "@/lib/logger";

const HISTORY_TTL_S = 30 * 24 * 60 * 60; // 30 days

const lastLoginIps = new Map<string, string>();

interface AuditRedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { ex: number }): Promise<unknown>;
}

let redisPromise: Promise<AuditRedisLike | null> | null = null;
let redisDisabledUntil = 0;

async function getAuditRedis(): Promise<AuditRedisLike | null> {
  if (Date.now() < redisDisabledUntil) return null;
  if (redisPromise) return redisPromise;

  redisPromise = (async () => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    try {
      const { Redis } = await import("@upstash/redis");
      return new Redis({ url, token });
    } catch (err) {
      logger.warn("Redis unavailable for login audit; using in-memory fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  })();

  return redisPromise;
}

const auditKey = (email: string) => `lms:login-ip:${email}`;

/** Hashes the client IP so the raw address is never persisted. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Records the hashed IP of a successful login. Returns true when this is a
 * NEW network for the account (different from the last recorded IP).
 */
export async function recordLoginIp(
  email: string,
  ip: string
): Promise<{ isNewIp: boolean }> {
  const hashed = hashIp(ip);
  let previous: string | null = null;

  const redis = await getAuditRedis();
  if (redis) {
    try {
      previous = await redis.get(auditKey(email));
      await redis.set(auditKey(email), hashed, { ex: HISTORY_TTL_S });
      return { isNewIp: previous !== null && previous !== hashed };
    } catch (err) {
      redisDisabledUntil = Date.now() + 60_000;
      logger.warn("Redis login-audit write failed; using in-memory fallback for 60s", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  previous = lastLoginIps.get(email) ?? null;
  lastLoginIps.set(email, hashed);
  return { isNewIp: previous !== null && previous !== hashed };
}

/** Test hook. */
export function clearLoginAudit() {
  lastLoginIps.clear();
}
