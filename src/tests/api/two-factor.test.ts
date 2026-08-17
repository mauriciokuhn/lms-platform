/**
 * Unit tests for the 2FA email-code module (src/lib/two-factor.ts).
 *
 * Covers the code lifecycle: issue → verify, one-time use, expiry and the
 * brute-force guard (5 attempts per code). Runs against the in-memory
 * fallback store (no Redis in tests).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  issueTwoFactorCode,
  verifyTwoFactorCode,
  clearTwoFactorCodes,
} from "@/lib/two-factor";

describe("two-factor email codes", () => {
  beforeEach(() => {
    clearTwoFactorCodes();
  });

  it("issues a 6-digit numeric code", async () => {
    const code = await issueTwoFactorCode("alice@test.com");
    expect(code).toMatch(/^\d{6}$/);
  });

  it("accepts the issued code", async () => {
    const code = await issueTwoFactorCode("alice@test.com");
    await expect(verifyTwoFactorCode("alice@test.com", code)).resolves.toBe(true);
  });

  it("is one-time — a second verify with the same code fails", async () => {
    const code = await issueTwoFactorCode("alice@test.com");
    await expect(verifyTwoFactorCode("alice@test.com", code)).resolves.toBe(true);
    await expect(verifyTwoFactorCode("alice@test.com", code)).resolves.toBe(false);
  });

  it("rejects a wrong code", async () => {
    await issueTwoFactorCode("alice@test.com");
    await expect(verifyTwoFactorCode("alice@test.com", "000000")).resolves.toBe(false);
  });

  it("rejects a code for a different account", async () => {
    const code = await issueTwoFactorCode("alice@test.com");
    await expect(verifyTwoFactorCode("bob@test.com", code)).resolves.toBe(false);
  });

  it("rejects expired codes", async () => {
    // Issue directly with a past expiry via the store is not exposed — the
    // TTL is enforced by readEntry using expiresAt. Simulate by issuing and
    // then verifying after forcing expiry through the module's Date.now.
    const originalNow = Date.now;
    const code = await issueTwoFactorCode("alice@test.com");
    // Mock time forward 6 minutes (beyond the 5-min TTL).
    vi.useFakeTimers();
    vi.setSystemTime(originalNow() + 6 * 60 * 1000);
    await expect(verifyTwoFactorCode("alice@test.com", code)).resolves.toBe(false);
    vi.useRealTimers();
  });

  it("locks the code after 5 failed attempts (entry deleted)", async () => {
    const code = await issueTwoFactorCode("alice@test.com");
    for (let i = 0; i < 5; i++) {
      await expect(verifyTwoFactorCode("alice@test.com", "999999")).resolves.toBe(false);
    }
    // Entry was deleted after the 5th failure — even the right code fails now.
    await expect(verifyTwoFactorCode("alice@test.com", code)).resolves.toBe(false);
  });

  it("re-issuing replaces the previous code", async () => {
    const first = await issueTwoFactorCode("alice@test.com");
    const second = await issueTwoFactorCode("alice@test.com");
    expect(second).not.toBe(first);
    await expect(verifyTwoFactorCode("alice@test.com", first)).resolves.toBe(false);
    await expect(verifyTwoFactorCode("alice@test.com", second)).resolves.toBe(true);
  });
});
