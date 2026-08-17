/**
 * Two-factor authentication (email code).
 *
 * A 6-digit code is issued per account and must be verified before a
 * session is created. Codes are one-time, expire after 5 minutes and are
 * rate-limited (5 attempts per code) against brute force. Stored in Redis
 * (UPSTASH_REDIS_*) when configured, with an in-memory fallback — the
 * pattern used across the auth hardening modules.
 */

import { logger } from "@/lib/logger";

const CODE_TTL_MS = 5 * 60 * 1000;
const CODE_TTL_S = Math.ceil(CODE_TTL_MS / 1000);
const MAX_ATTEMPTS = 5;

interface CodeEntry {
  code: string;
  attempts: number;
  expiresAt: number;
}

const codes = new Map<string, CodeEntry>();

interface TwoFactorRedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { ex: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

let redisPromise: Promise<TwoFactorRedisLike | null> | null = null;
let redisDisabledUntil = 0;

async function getRedis(): Promise<TwoFactorRedisLike | null> {
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
      logger.warn("Redis unavailable for 2FA codes; using in-memory fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  })();

  return redisPromise;
}

const codeKey = (email: string) => `lms:2fa:${email}`;

async function readEntry(email: string): Promise<CodeEntry | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(codeKey(email));
      if (!raw) return null;
      return JSON.parse(raw) as CodeEntry;
    } catch (err) {
      redisDisabledUntil = Date.now() + 60_000;
      logger.warn("Redis 2FA read failed; using in-memory fallback for 60s", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return codes.get(email) ?? null;
}

async function writeEntry(email: string, entry: CodeEntry) {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(codeKey(email), JSON.stringify(entry), { ex: CODE_TTL_S });
      return;
    } catch (err) {
      redisDisabledUntil = Date.now() + 60_000;
      logger.warn("Redis 2FA write failed; using in-memory fallback for 60s", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  codes.set(email, entry);
}

async function deleteEntry(email: string) {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(codeKey(email));
      return;
    } catch {
      redisDisabledUntil = Date.now() + 60_000;
    }
  }
  codes.delete(email);
}

/** Issues a fresh 6-digit code for the account (replaces any previous). */
export async function issueTwoFactorCode(email: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await writeEntry(email, { code, attempts: 0, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
}

/**
 * Verifies a code (one-time). Returns false for wrong/expired codes and
 * after MAX_ATTEMPTS failed tries (the entry is then deleted).
 */
export async function verifyTwoFactorCode(email: string, code: string): Promise<boolean> {
  const entry = await readEntry(email);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    await deleteEntry(email);
    return false;
  }
  if (entry.code !== code) {
    if (entry.attempts + 1 >= MAX_ATTEMPTS) {
      await deleteEntry(email);
    } else {
      await writeEntry(email, { ...entry, attempts: entry.attempts + 1 });
    }
    return false;
  }
  await deleteEntry(email);
  return true;
}

/** Test hook. */
export function clearTwoFactorCodes() {
  codes.clear();
}
