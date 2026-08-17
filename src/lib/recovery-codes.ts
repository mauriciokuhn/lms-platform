/**
 * 2FA recovery codes.
 *
 * One-time fallback codes shown ONLY at generation time — if the user
 * loses access to their e-mail they can still sign in. Stored as SHA-256
 * hashes (never the plaintext); a code is consumed on first use. Codes use
 * an unambiguous alphabet (no 0/O/1/I) and the brute-force guard is the
 * same per-account rate limiter that protects the emailed code.
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RECOVERY_CODE_LENGTH = 8;
export const RECOVERY_CODE_COUNT = 8;

const encoder = new TextEncoder();

/** SHA-256 hex digest of a plaintext code. */
export async function hashRecoveryCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(code));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generates `count` fresh plaintext recovery codes (grouped xxxx-xxxx). */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const random = new Uint8Array(count * RECOVERY_CODE_LENGTH);
  crypto.getRandomValues(random);
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let raw = "";
    for (let j = 0; j < RECOVERY_CODE_LENGTH; j++) {
      raw += ALPHABET[random[i * RECOVERY_CODE_LENGTH + j] % ALPHABET.length];
    }
    // Grouped as XXXX-XXXX for readability; the stored hash uses the raw form.
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/** True when the input looks like a recovery code (e.g. "K7XQ-9M2P"). */
export function isRecoveryCodeFormat(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code);
}
