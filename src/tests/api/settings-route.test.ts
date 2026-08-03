/**
 * Route-level tests for GET/PATCH /api/settings.
 *
 * Exercises the real handlers: 401 guard, defaults for a user without
 * settings, upsert semantics, soundTone enum validation, and rejection of
 * an empty PATCH body.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { GET, PATCH } from "@/app/api/settings/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

function patchSettings(body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request("http://localhost/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(req);
}

describe("Settings route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await GET()).status).toBe(401);
    expect((await patchSettings({ soundEnabled: false })).status).toBe(401);
  });

  it("returns defaults when no settings exist", async () => {
    const user = await createTestUser(prisma, { email: "s-defaults@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id }));

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      soundEnabled: true,
      soundTone: "CHIME",
      vibrationEnabled: true,
      doNotDisturb: false,
      dndStartTime: null,
      dndEndTime: null,
    });
  });

  it("creates settings on first PATCH (upsert)", async () => {
    const user = await createTestUser(prisma, { email: "s-create@test.com" });
    const session = createMockSession({ id: user.id });

    const res = await patchSettings({ soundEnabled: false, soundTone: "POP" }, session);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.soundEnabled).toBe(false);
    expect(data.soundTone).toBe("POP");

    const inDb = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    expect(inDb?.soundTone).toBe("POP");
    expect(inDb?.vibrationEnabled).toBe(true); // untouched defaults
  });

  it("updates existing settings in place", async () => {
    const user = await createTestUser(prisma, { email: "s-update@test.com" });
    const session = createMockSession({ id: user.id });

    await prisma.userSettings.create({
      data: { userId: user.id, soundEnabled: true, soundTone: "CHIME", vibrationEnabled: true, doNotDisturb: false },
    });

    const res = await patchSettings({ soundEnabled: true, doNotDisturb: true, dndStartTime: "22:00", dndEndTime: "07:00" }, session);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.doNotDisturb).toBe(true);
    expect(data.dndStartTime).toBe("22:00");
    expect(data.dndEndTime).toBe("07:00");
  });

  it("rejects an invalid soundTone", async () => {
    const user = await createTestUser(prisma, { email: "s-tone@test.com" });
    const res = await patchSettings({ soundTone: "BASS" }, createMockSession({ id: user.id }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("inválido");
  });

  it("rejects an empty PATCH body", async () => {
    const user = await createTestUser(prisma, { email: "s-empty@test.com" });
    const res = await patchSettings({}, createMockSession({ id: user.id }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Nenhum campo");
  });
});
