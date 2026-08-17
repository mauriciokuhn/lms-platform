/**
 * Login anti-bot challenge.
 *
 * After a few consecutive failed logins, the login form asks a simple math
 * question ("Quanto é A + B?"). The server issues a one-time token bound to
 * the answer and verifies it on the credentials callback — cheap protection
 * against scripted credential stuffing, without any external CAPTCHA service.
 *
 * Tokens are stored in Redis (UPSTASH_REDIS_*) so they survive restarts and
 * multiple instances, with a short TTL; a per-process in-memory store serves
 * as fallback (local dev, tests, or a Redis outage — a leaked token expires
 * in minutes and is useless without the answer, so the fallback is fine).
 */

import { logger } from "@/lib/logger";

/** Failed logins required before the challenge kicks in. */
export const CHALLENGE_THRESHOLD = 3;

const TTL_MS = 5 * 60 * 1000;
const TTL_S = Math.ceil(TTL_MS / 1000);

const challenges = new Map<string, { answer: number; expiresAt: number }>();

// ─── Metrics (in-memory; reset on restart) ───────────────────────
// Aggregated challenge counters so admins can watch brute-force pressure
// in real time. Per-process by design — a restart zeroes them, which is
// fine for short-horizon monitoring.
interface AccountStats {
  issued: number;
  solved: number;
  failed: number;
}

const stats: { issued: number; solved: number; failed: number; byAccount: Map<string, AccountStats> } = {
  issued: 0,
  solved: 0,
  failed: 0,
  byAccount: new Map(),
};

function bump(email: string | undefined, field: keyof AccountStats) {
  if (field === "issued") stats.issued++;
  if (field === "solved") stats.solved++;
  if (field === "failed") stats.failed++;
  if (!email) return;
  const entry = stats.byAccount.get(email) ?? { issued: 0, solved: 0, failed: 0 };
  entry[field]++;
  stats.byAccount.set(email, entry);
}

/** Snapshot of the challenge counters (aggregate + per account). */
export function getChallengeStats() {
  const byAccount = [...stats.byAccount.entries()]
    .map(([email, s]) => ({ email, ...s }))
    .sort((a, b) => b.issued - a.issued);
  const attempted = stats.solved + stats.failed;
  return {
    total: {
      issued: stats.issued,
      solved: stats.solved,
      failed: stats.failed,
      solveRate: attempted > 0 ? Math.round((stats.solved / attempted) * 100) : null,
    },
    byAccount,
  };
}

/** Test hook. */
export function clearChallengeStats() {
  stats.issued = 0;
  stats.solved = 0;
  stats.failed = 0;
  stats.byAccount.clear();
}

interface ChallengeRedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { ex: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

let redisPromise: Promise<ChallengeRedisLike | null> | null = null;
let redisDisabledUntil = 0;

async function getChallengeRedis(): Promise<ChallengeRedisLike | null> {
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
      logger.warn("Redis unavailable for login challenges; using in-memory fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  })();

  return redisPromise;
}

const challengeKey = (token: string) => `lms:login-challenge:${token}`;

/**
 * Issues a fresh challenge; returns the token + the human-readable question.
 * Async because the token may be persisted to Redis.
 */
export async function issueLoginChallenge(
  email?: string
): Promise<{ token: string; question: string }> {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const token = crypto.randomUUID();
  const answer = a + b;
  bump(email, "issued");

  const redis = await getChallengeRedis();
  if (redis) {
    try {
      await redis.set(challengeKey(token), String(answer), { ex: TTL_S });
      return { token, question: `Quanto é ${a} + ${b}?` };
    } catch (err) {
      redisDisabledUntil = Date.now() + 60_000;
      logger.warn("Redis challenge write failed; using in-memory fallback for 60s", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  challenges.set(token, { answer, expiresAt: Date.now() + TTL_MS });
  return { token, question: `Quanto é ${a} + ${b}?` };
}

/**
 * Verifies a challenge answer (one-time use; consumes the token).
 * Async because the token may live in Redis. `email` (optional) feeds the
 * per-account metrics shown to admins.
 */
export async function verifyLoginChallenge(
  token: string | undefined,
  answer: string | undefined,
  email?: string
): Promise<boolean> {
  if (!token || !answer) {
    bump(email, "failed");
    return false;
  }

  const redis = await getChallengeRedis();
  if (redis) {
    try {
      const stored = await redis.get(challengeKey(token));
      if (stored === null) {
        bump(email, "failed");
        return false;
      }
      // One-time use: consume the token regardless of the answer's validity.
      await redis.del(challengeKey(token));
      const ok = stored === String(answer).trim();
      bump(email, ok ? "solved" : "failed");
      return ok;
    } catch (err) {
      redisDisabledUntil = Date.now() + 60_000;
      logger.warn("Redis challenge check failed; using in-memory fallback for 60s", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const entry = challenges.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    bump(email, "failed");
    return false;
  }
  challenges.delete(token);
  const ok = String(entry.answer).trim() === String(answer).trim();
  bump(email, ok ? "solved" : "failed");
  return ok;
}

/** Test hook. */
export function clearLoginChallenges() {
  challenges.clear();
}
