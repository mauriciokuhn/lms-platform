/**
 * Unit tests for the login anti-bot challenge
 * (src/lib/login-challenge.ts).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  issueLoginChallenge,
  verifyLoginChallenge,
  clearLoginChallenges,
  CHALLENGE_THRESHOLD,
} from "@/lib/login-challenge";

describe("login challenge", () => {
  beforeEach(() => {
    clearLoginChallenges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("issues a challenge with a readable math question", async () => {
    const { token, question } = await issueLoginChallenge();
    expect(token).toBeTruthy();
    expect(question).toMatch(/^Quanto é \d+ \+ \d+\?$/);
  });

  it("accepts the correct answer", async () => {
    // Deterministic operands: Math.random() = 0.5 → a = floor(10)+1 = 11,
    // b = 11 → answer 22.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { token, question } = await issueLoginChallenge();
    expect(question).toBe("Quanto é 11 + 11?");
    expect(await verifyLoginChallenge(token, "22")).toBe(true);
  });

  it("rejects a wrong answer", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { token } = await issueLoginChallenge();
    expect(await verifyLoginChallenge(token, "999")).toBe(false);
  });

  it("is one-time use", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { token } = await issueLoginChallenge();
    expect(await verifyLoginChallenge(token, "22")).toBe(true);
    // Second use of the same token fails — it was consumed.
    expect(await verifyLoginChallenge(token, "22")).toBe(false);
  });

  it("rejects missing or unknown tokens", async () => {
    expect(await verifyLoginChallenge(undefined, "5")).toBe(false);
    expect(await verifyLoginChallenge("nope", "5")).toBe(false);
  });

  it("exposes the threshold used by the auth route", () => {
    expect(CHALLENGE_THRESHOLD).toBe(3);
  });
});
