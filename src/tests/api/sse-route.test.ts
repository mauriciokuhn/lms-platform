/**
 * Route-level tests for GET /api/events/subscribe (Server-Sent Events).
 *
 * Covers the auth guard and the SSE stream shape (content-type, initial
 * heartbeat payload). The stream is cancelled immediately after the first
 * chunk so the keep-alive interval is cleaned up.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { GET } from "@/app/api/events/subscribe/route";
import { notifyUser } from "@/lib/event-bus";
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser, createMockSession } from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

async function readFirstChunk(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  try {
    const { value, done } = await reader.read();
    if (done || !value) return "";
    return new TextDecoder().decode(value);
  } finally {
    await reader.cancel();
  }
}

describe("SSE subscribe route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    authMock.auth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("opens an SSE stream with text/event-stream content type", async () => {
    const user = await createTestUser(prisma, { email: "sse-ok@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id }));

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toContain("no-cache");
  });

  it("sends an initial heartbeat with the connected status", async () => {
    const user = await createTestUser(prisma, { email: "sse-heartbeat@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id }));

    const res = await GET();
    expect(res.body).toBeTruthy();
    const chunk = await readFirstChunk(res.body!);
    expect(chunk).toContain("heartbeat");
    expect(chunk).toContain("connected");
  });

  it("delivers notifications only to the target user's stream", async () => {
    const userA = await createTestUser(prisma, { email: "sse-scope-a@test.com" });
    const userB = await createTestUser(prisma, { email: "sse-scope-b@test.com" });

    authMock.auth.mockResolvedValue(createMockSession({ id: userA.id }));
    const resA = await GET();
    const readerA = resA.body!.getReader();
    await readerA.read(); // consume A's heartbeat

    authMock.auth.mockResolvedValue(createMockSession({ id: userB.id }));
    const resB = await GET();
    const readerB = resB.body!.getReader();
    await readerB.read(); // consume B's heartbeat

    // try/finally guarantees both 30s heartbeat intervals are cleared even
    // if an assertion fails mid-test — a leaked stream would keep Node alive.
    try {
      const payload = await notifyUser(userA.id, {
        type: "LESSON_COMPLETED",
        title: "Aula concluída",
        message: "Bom trabalho!",
      });

      // User A receives the notification event with the created payload.
      const { value: valueA } = await readerA.read();
      const chunkA = new TextDecoder().decode(valueA);
      expect(chunkA).toContain("notification");
      expect(chunkA).toContain(payload.id);

      // User B must NOT receive it within a short window. The losing
      // readerB.read() promise is handled by Promise.race (no unhandled
      // rejection) and cancelled in finally below.
      const racedB = await Promise.race([
        readerB.read().then(({ value }) => (value ? new TextDecoder().decode(value) : null)),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 250)),
      ]);
      expect(racedB).toBeNull();
    } finally {
      await readerA.cancel().catch(() => {});
      await readerB.cancel().catch(() => {});
    }
  });
});
