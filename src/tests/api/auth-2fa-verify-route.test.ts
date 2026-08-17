/**
 * Route tests for POST /api/auth/2fa/verify — the second step of a 2FA
 * login. Exercises the full happy path (valid code → session cookie +
 * login history recorded) and the failure paths (missing fields, wrong
 * code, unknown account).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));
vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

import { POST } from "@/app/api/auth/2fa/verify/route";
import { issueTwoFactorCode } from "@/lib/two-factor";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/recovery-codes";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
} from "../setup";

// encodeSessionToken requires AUTH_SECRET (read at call time).
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-secret-2fa";

const prisma = getTestDb();
dbHolder.prisma = prisma;

async function postVerify(body: Record<string, unknown>) {
  const request = new NextRequest("http://localhost/api/auth/2fa/verify", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Vitest UA" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/auth/2fa/verify", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 400 when fields are missing", async () => {
    expect((await postVerify({})).status).toBe(400);
    expect((await postVerify({ email: "x@test.com" })).status).toBe(400);
    expect((await postVerify({ code: "123456" })).status).toBe(400);
  });

  it("returns 400 for a wrong code", async () => {
    const user = await createTestUser(prisma, { email: "2fa-wrong@test.com", twoFactorEnabled: true });
    await issueTwoFactorCode(user.email);
    const res = await postVerify({ email: user.email, code: "000000" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Código inválido");
  });

  it("creates the session and records the login history on a valid code", async () => {
    const user = await createTestUser(prisma, {
      email: "2fa-ok@test.com",
      twoFactorEnabled: true,
      name: "Dois Fatores",
    });

    const code = await issueTwoFactorCode(user.email);
    const res = await postVerify({ email: user.email, code });
    expect(res.status).toBe(200);

    // The response sets the Auth.js session cookie.
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("authjs.session-token=");

    // Login history was recorded for this login (hashed IP, UA, token hash).
    const history = await prisma.loginHistory.findMany({ where: { userId: user.id } });
    expect(history).toHaveLength(1);
    expect(history[0].ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(history[0].userAgent).toBe("Vitest UA");
    expect(history[0].sessionTokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns 404 when the account does not exist", async () => {
    const code = await issueTwoFactorCode("2fa-ghost@test.com");
    const res = await postVerify({ email: "2fa-ghost@test.com", code });
    expect(res.status).toBe(404);
  });

  it("accepts a one-time recovery code and creates the session", async () => {
    const user = await createTestUser(prisma, {
      email: "2fa-recovery@test.com",
      twoFactorEnabled: true,
    });
    const [code] = generateRecoveryCodes(1);
    await prisma.twoFactorRecoveryCode.create({
      data: { userId: user.id, codeHash: await hashRecoveryCode(code.replace("-", "")) },
    });

    // First use: accepted, session created.
    const res = await postVerify({ email: user.email, code });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie") ?? "").toContain("authjs.session-token=");

    // The code is consumed — a second use fails.
    const again = await postVerify({ email: user.email, code });
    expect(again.status).toBe(400);

    const record = await prisma.twoFactorRecoveryCode.findFirst({ where: { userId: user.id } });
    expect(record?.usedAt).toBeTruthy();
  });

  it("rejects a recovery code when 2FA is disabled", async () => {
    const user = await createTestUser(prisma, { email: "2fa-recovery-off@test.com" });
    const [code] = generateRecoveryCodes(1);
    await prisma.twoFactorRecoveryCode.create({
      data: { userId: user.id, codeHash: await hashRecoveryCode(code.replace("-", "")) },
    });

    const res = await postVerify({ email: user.email, code });
    expect(res.status).toBe(400);
  });
});
