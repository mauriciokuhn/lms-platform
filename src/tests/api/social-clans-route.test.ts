/**
 * Route-level tests for GET/POST /api/social/clans.
 *
 * Exercises the real handlers: 401 guard, clan ranking listing, clan
 * creation (name required, duplicate name → 400), joining (already-in-a-clan
 * → 400), and invalid-action rejection.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

vi.mock("@/lib/cache", () => ({
  cache: {
    getOrSet: vi.fn(async (_key: string, fetcher: () => unknown) => fetcher()),
    invalidate: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
  },
}));

import { GET, POST } from "@/app/api/social/clans/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

function postClan(body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request("http://localhost/api/social/clans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("Social clans route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await GET()).status).toBe(401);
    expect((await postClan({ action: "create", name: "X" })).status).toBe(401);
  });

  it("GET returns clans ranked by xp with member info", async () => {
    const user = await createTestUser(prisma, { email: "cl-get@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id }));

    const leader = await createTestUser(prisma, { email: "cl-leader@test.com" });
    const clanA = await prisma.clan.create({ data: { name: "Lobos", xp: 500, level: 3 } });
    const clanB = await prisma.clan.create({ data: { name: "Águias", xp: 900, level: 5 } });
    await prisma.clanMember.create({ data: { clanId: clanA.id, userId: leader.id, role: "LEADER" } });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.clans).toHaveLength(2);
    expect(data.clans[0].id).toBe(clanB.id);
    expect(data.clans[0].name).toBe("Águias"); // highest xp first
    expect(data.clans[0].rank).toBe(1);
    expect(data.clans[0].level).toBe(5);
    expect(data.clans[0].membersCount).toBe(0);
    expect(data.clans[1].name).toBe("Lobos");
    expect(data.clans[1].members).toHaveLength(1);
    expect(data.clans[1].members[0].role).toBe("LEADER");
  });

  it("POST create: requires name and rejects duplicates", async () => {
    const user = await createTestUser(prisma, { email: "cl-create@test.com" });
    const session = createMockSession({ id: user.id });

    const noName = await postClan({ action: "create" }, session);
    expect(noName.status).toBe(400);

    const created = await postClan({ action: "create", name: "Fênix" }, session);
    expect(created.status).toBe(201);
    const clan = await created.json();
    expect(clan.name).toBe("Fênix");

    // creator became leader automatically
    const member = await prisma.clanMember.findFirst({ where: { userId: user.id } });
    expect(member?.role).toBe("LEADER");

    const dup = await postClan({ action: "create", name: "Fênix" }, session);
    expect(dup.status).toBe(400);
    expect((await dup.json()).error).toContain("clan com este nome");
  });

  it("POST join: rejects when already in a clan", async () => {
    const user = await createTestUser(prisma, { email: "cl-join@test.com" });
    const session = createMockSession({ id: user.id });
    const clan = await prisma.clan.create({ data: { name: "Alvo", xp: 100 } });
    await prisma.clanMember.create({ data: { clanId: clan.id, userId: user.id, role: "MEMBER" } });

    const res = await postClan({ action: "join", clanId: clan.id }, session);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("já está em um clan");
  });

  it("POST join: adds the member when free", async () => {
    const user = await createTestUser(prisma, { email: "cl-join2@test.com" });
    const session = createMockSession({ id: user.id });
    const clan = await prisma.clan.create({ data: { name: "Alvo 2", xp: 100 } });

    const res = await postClan({ action: "join", clanId: clan.id }, session);
    expect(res.status).toBe(201);
    const member = await prisma.clanMember.findFirst({ where: { userId: user.id } });
    expect(member?.role).toBe("MEMBER");
    expect(member?.clanId).toBe(clan.id);
  });

  it("POST rejects an invalid action", async () => {
    const user = await createTestUser(prisma, { email: "cl-invalid@test.com" });
    const res = await postClan({ action: "explode" }, createMockSession({ id: user.id }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("inválida");
  });
});
