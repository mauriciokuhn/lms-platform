/**
 * Route tests for PATCH /api/profile — currently the 2FA toggle
 * (twoFactorEnabled). Verifies the auth guard, the toggle round-trip and
 * that GET reflects the new value.
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

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { PATCH, GET } from "@/app/api/profile/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

function patchRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/profile", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await PATCH(patchRequest({ twoFactorEnabled: true }))).status).toBe(401);
  });

  it("returns 400 when nothing to update", async () => {
    const user = await createTestUser(prisma, { email: "patch-none@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id }));
    const res = await PATCH(patchRequest({}));
    expect(res.status).toBe(400);
  });

  it("toggles twoFactorEnabled and GET reflects it", async () => {
    const user = await createTestUser(prisma, { email: "patch-2fa@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id, email: user.email }));

    // Initially off.
    const before = await (await GET(patchRequest({}))).json();
    expect(before.user.twoFactorEnabled).toBe(false);

    // Turn it on.
    const on = await PATCH(patchRequest({ twoFactorEnabled: true }));
    expect(on.status).toBe(200);
    expect((await on.json()).twoFactorEnabled).toBe(true);

    const afterOn = await (await GET(patchRequest({}))).json();
    expect(afterOn.user.twoFactorEnabled).toBe(true);

    // And off again.
    const off = await PATCH(patchRequest({ twoFactorEnabled: false }));
    expect(off.status).toBe(200);
    const afterOff = await (await GET(patchRequest({}))).json();
    expect(afterOff.user.twoFactorEnabled).toBe(false);
  });
});
