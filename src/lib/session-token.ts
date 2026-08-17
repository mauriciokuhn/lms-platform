/**
 * Session-token helpers.
 *
 * The app uses Auth.js with the JWT strategy: the session cookie
 * (`authjs.session-token`) holds an encrypted JWE. These helpers:
 *  - hash the raw token (SHA-256) so we can store/blacklist it without
 *    ever persisting the token itself;
 *  - decode the token (jose + the same HKDF derivation Auth.js uses) so
 *    the OAuth sign-in path can attribute a login to a user.
 *
 * Everything here is Edge-safe (WebCrypto only) so the middleware can
 * reuse the hash for the revoked-session check.
 */

import { jwtDecrypt, EncryptJWT } from "jose";
import { hkdf } from "@panva/hkdf";

export const SESSION_COOKIE_NAME = "authjs.session-token";

const encoder = new TextEncoder();

/** SHA-256 hex digest of the raw session token. */
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface SessionTokenPayload {
  sub?: string;
  email?: string;
  exp?: number;
}

/**
 * Decrypts an Auth.js session JWE. Returns null on any failure (bad token,
 * wrong secret, expired) — callers treat it as best-effort.
 */
export async function decodeSessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;
    // Same derivation as @auth/core/jwt.ts getDerivedEncryptionKey():
    // hkdf(sha256, secret, cookieName, "Auth.js Generated Encryption Key (<cookieName>)", 64).
    const key = await hkdf(
      "sha256",
      secret,
      SESSION_COOKIE_NAME,
      `Auth.js Generated Encryption Key (${SESSION_COOKIE_NAME})`,
      64
    );
    const { payload } = await jwtDecrypt(token, key);
    return {
      sub: payload.sub as string | undefined,
      email: payload.email as string | undefined,
      exp: payload.exp as number | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Builds a signed session JWE exactly like Auth.js (same algorithm and
 * HKDF derivation) — used by the 2FA flow, which must create a session
 * after the code is verified.
 */
export async function encodeSessionToken(
  payload: { sub: string; email?: string; name?: string | null; role?: string; plan?: string; isDemo?: boolean },
  maxAgeS = 30 * 24 * 60 * 60
): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const key = await hkdf(
    "sha256",
    secret,
    SESSION_COOKIE_NAME,
    `Auth.js Generated Encryption Key (${SESSION_COOKIE_NAME})`,
    64
  );
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeS}s`)
    .encrypt(key);
}

/**
 * Extracts the session-token value from a Set-Cookie header string (the
 * token is base64url — it never contains ";" or ",").
 */
export function extractSessionTokenFromSetCookie(setCookie: string | null): string | null {
  if (!setCookie) return null;
  const marker = `${SESSION_COOKIE_NAME}=`;
  const idx = setCookie.indexOf(marker);
  if (idx === -1) return null;
  const rest = setCookie.slice(idx + marker.length);
  const end = rest.search(/[;,]/);
  return (end === -1 ? rest : rest.slice(0, end)).trim() || null;
}
