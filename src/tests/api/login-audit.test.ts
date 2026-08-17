/**
 * Unit tests for the login-audit module (new-network login detection).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { recordLoginIp, hashIp, clearLoginAudit } from "@/lib/login-audit";

describe("login audit", () => {
  beforeEach(() => {
    clearLoginAudit();
  });

  it("does not flag the first login of an account as new", async () => {
    const { isNewIp } = await recordLoginIp("aluno@exemplo.com", "203.0.113.10");
    expect(isNewIp).toBe(false);
  });

  it("flags a login from a different IP as new", async () => {
    await recordLoginIp("aluno@exemplo.com", "203.0.113.10");
    const { isNewIp } = await recordLoginIp("aluno@exemplo.com", "203.0.113.99");
    expect(isNewIp).toBe(true);
  });

  it("does not flag the same IP twice", async () => {
    await recordLoginIp("aluno@exemplo.com", "203.0.113.10");
    const { isNewIp } = await recordLoginIp("aluno@exemplo.com", "203.0.113.10");
    expect(isNewIp).toBe(false);
  });

  it("keeps accounts isolated from each other", async () => {
    await recordLoginIp("a@exemplo.com", "203.0.113.10");
    const { isNewIp } = await recordLoginIp("b@exemplo.com", "203.0.113.10");
    expect(isNewIp).toBe(false);
  });

  it("hashes IPs deterministically (never stores the raw address)", () => {
    expect(hashIp("203.0.113.10")).toBe(hashIp("203.0.113.10"));
    expect(hashIp("203.0.113.10")).not.toBe(hashIp("203.0.113.11"));
    expect(hashIp("203.0.113.10")).not.toContain("203.0.113.10");
    expect(hashIp("203.0.113.10")).toMatch(/^[0-9a-f]{64}$/);
  });
});
