/**
 * Tests for the 2FA recovery-codes module and the profile endpoints.
 *
 * Lib: code format, hash determinism, unambiguous alphabet.
 * Endpoints: POST generates a fresh set (plaintext once, hashes stored),
 * GET reports how many remain, regenerating invalidates the previous set.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));
vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import {
  generateRecoveryCodes,
  hashRecoveryCode,
  isRecoveryCodeFormat,
  RECOVERY_CODE_COUNT,
} from "@/lib/recovery-codes";
import { POST, GET } from "@/app/api/profile/2fa/recovery-codes/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

describe("recovery-codes lib", () => {
  it("generates 8 codes in XXXX-XXXX format without ambiguous characters", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    for (const code of codes) {
      expect(isRecoveryCodeFormat(code)).toBe(true);
      expect(/[01IO]/.test(code)).toBe(false);
    }
  });

  it("hashes deterministically and uniquely", async () => {
    const a = await hashRecoveryCode("ABCD-EFGH");
    const b = await hashRecoveryCode("ABCD-EFGH");
    const c = await hashRecoveryCode("ABCD-EFGI");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("validates only the unambiguous XXXX-XXXX format", () => {
    expect(isRecoveryCodeFormat("K7XQ-9M2P")).toBe(true);
    expect(isRecoveryCodeFormat("1234-5678")).toBe(false); // 1/0 not in alphabet
    expect(isRecoveryCodeFormat("k7xq-9m2p")).toBe(false); // lowercase
    expect(isRecoveryCodeFormat("K7XQ9M2P")).toBe(false); // no dash
    expect(isRecoveryCodeFormat("K7XQ-9M2")).toBe(false); // short
  });
});

describe("recovery-codes endpoints", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("requires authentication", async () => {
    expect((await POST()).status).toBe(401);
    expect((await GET()).status).toBe(401);
  });

  it("generates codes once (plaintext) and stores only hashes", async () => {
    const user = await createTestUser(prisma, { email: "rec-gen@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id, email: user.email }));

    const res = await POST();
    expect(res.status).toBe(200);
    const { codes } = await res.json();
    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);

    // The hashes are stored — never the plaintext.
    const stored = await prisma.twoFactorRecoveryCode.findMany({ where: { userId: user.id } });
    expect(stored).toHaveLength(RECOVERY_CODE_COUNT);
    const plaintexts = new Set(codes.map((c: string) => c.replace("-", "")));
    for (const rec of stored) {
      expect(plaintexts.has(rec.codeHash)).toBe(false);
      expect(rec.codeHash).toMatch(/^[0-9a-f]{64}$/);
    }

    // GET reports the remaining count (never the codes).
    const getRes = await GET();
    const data = await getRes.json();
    expect(data.remaining).toBe(RECOVERY_CODE_COUNT);
  });

  it("regenerating revokes the previous set", async () => {
    const user = await createTestUser(prisma, { email: "rec-regen@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id, email: user.email }));

    const first = await (await POST()).json();
    await POST(); // regenerate
    const stored = await prisma.twoFactorRecoveryCode.findMany({ where: { userId: user.id } });
    expect(stored).toHaveLength(RECOVERY_CODE_COUNT);

    // The old plaintexts no longer match any stored hash.
    const hashes = new Set(stored.map((s) => s.codeHash));
    for (const code of first.codes) {
      const h = await hashRecoveryCode(code.replace("-", ""));
      expect(hashes.has(h)).toBe(false);
    }
  });
});
