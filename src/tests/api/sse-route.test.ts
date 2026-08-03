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
});
