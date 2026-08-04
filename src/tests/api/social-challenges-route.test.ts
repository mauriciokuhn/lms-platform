/**
 * Route-level tests for GET/POST /api/social/challenges.
 *
 * Exercises the real handlers: 401 guard, active-challenge filtering with
 * participant progress, join flow (missing id → 400, inactive/unknown →
 * 400, duplicate join → 400, success), and the past-challenges list.
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

vi.mock("@/lib/cache", () => ({
  cache: {
    getOrSet: vi.fn(async (_key: string, fetcher: () => unknown) => fetcher()),
    invalidate: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
  },
}));

import { GET, POST } from "@/app/api/social/challenges/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

function postChallenge(body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request("http://localhost/api/social/challenges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

function makeChallenge(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return prisma.challenge.create({
    data: {
      title: "Desafio da Semana",
      description: "Complete 5 aulas",
      goalType: "LESSONS",
      goalValue: 5,
      xpReward: 100,
      status: "ACTIVE",
      startsAt: new Date(now.getTime() - 86400000),
      endsAt: new Date(now.getTime() + 86400000),
      ...overrides,
    },
  });
}

describe("Social challenges route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await GET()).status).toBe(401);
    expect((await postChallenge({ challengeId: "x" })).status).toBe(401);
  });

  it("returns empty active/past lists for a fresh user", async () => {
    const user = await createTestUser(prisma, { email: "sc-empty@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id }));

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.active).toEqual([]);
    expect(data.past).toEqual([]);
  });

  it("lists only active challenges with participant counts and my progress", async () => {
    const user = await createTestUser(prisma, { email: "sc-list@test.com" });
    const other = await createTestUser(prisma, { email: "sc-other@test.com" });
    const session = createMockSession({ id: user.id });

    const active = await makeChallenge();
    await makeChallenge({ title: "Expirado", status: "COMPLETED" });
    await makeChallenge({
      title: "Futuro",
      startsAt: new Date(Date.now() + 2 * 86400000),
      endsAt: new Date(Date.now() + 3 * 86400000),
    });

    await prisma.challengeParticipant.create({
      data: { challengeId: active.id, userId: other.id, progress: 3 },
    });
    await prisma.challengeParticipant.create({
      data: { challengeId: active.id, userId: user.id, progress: 2 },
    });

    authMock.auth.mockResolvedValue(session);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.active).toHaveLength(1);
    expect(data.active[0].title).toBe("Desafio da Semana");
    expect(data.active[0].participantsCount).toBe(2);
    expect(data.active[0].myProgress).toBe(2);
    expect(data.active[0].myCompleted).toBe(false);
  });

  it("POST join: requires challengeId, unknown/inactive → 400, duplicate → 400, success → 200", async () => {
    const user = await createTestUser(prisma, { email: "sc-join@test.com" });
    const session = createMockSession({ id: user.id });
    const active = await makeChallenge({ title: "Participável" });
    await makeChallenge({ title: "Inativo", status: "COMPLETED" });

    expect((await postChallenge({}, session)).status).toBe(400);
    expect((await postChallenge({ challengeId: "inexistente" }, session)).status).toBe(400);

    const res = await postChallenge({ challengeId: active.id }, session);
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    // duplicate
    const dup = await postChallenge({ challengeId: active.id }, session);
    expect(dup.status).toBe(400);
    expect((await dup.json()).error).toContain("já participa");

    const participant = await prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId: active.id, userId: user.id } },
    });
    expect(participant?.progress).toBe(0);
  });

  it("POST join requires an ACTIVE challenge", async () => {
    const user = await createTestUser(prisma, { email: "sc-inactive@test.com" });
    const session = createMockSession({ id: user.id });
    const inactive = await makeChallenge({ title: "Encerrado", status: "COMPLETED" });

    const res = await postChallenge({ challengeId: inactive.id }, session);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("não está ativo");
  });
});
