/**
 * Unit tests for the SSE event bus (src/lib/event-bus.ts).
 *
 * Covers:
 *  - Connection registration/stats and cleanup on cancel
 *  - Initial + periodic (30s) heartbeats
 *  - User / admin / all broadcast scoping
 *  - notifyUser / notifyAdmins / notifyAllStudents persistence + broadcast
 *
 * The DB is the isolated test database (dbHolder mock pattern); the stream
 * heartbeats are driven with fake timers so the 30s interval is testable.
 */
import {
  describe,
  it,
  expect,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));
vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

import {
  subscribeSSE,
  broadcastToUser,
  broadcastToAll,
  broadcastToAdmins,
  notifyUser,
  notifyAdmins,
  notifyAllStudents,
  getConnectionStats,
  type SSEEvent,
} from "@/lib/event-bus";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

const openReaders: ReadableStreamDefaultReader<Uint8Array>[] = [];

function openStream(userId: string, role = "STUDENT") {
  const res = subscribeSSE(userId, role);
  const reader = res.body!.getReader();
  openReaders.push(reader);
  return reader;
}

async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const { value, done } = await reader.read();
  if (done || !value) return "";
  return new TextDecoder().decode(value);
}

/** Resolves with the next chunk, or null if nothing arrives within `ms`. */
async function expectNoChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  ms = 250
): Promise<string | null> {
  // When the timeout wins, the losing read() stays pending on the stream —
  // safe (Promise.race already attached handlers; afterEach cancels it).
  return Promise.race([
    reader.read().then(({ value }) => (value ? new TextDecoder().decode(value) : null)),
    new Promise<string | null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

const testEvent: SSEEvent = { type: "notification", payload: { id: "n1" } };

describe("SSE event bus", () => {
  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterEach(async () => {
    // Cancel every stream opened in the test so the 30s heartbeat intervals
    // are cleared and the module-level clients map is emptied.
    await Promise.allSettled(openReaders.splice(0).map((r) => r.cancel()));
    vi.useRealTimers();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("registers the client and reports connection stats", async () => {
    const reader = openStream("stats-user");
    expect(getConnectionStats()).toEqual({ total: 1, users: 1 });

    await reader.cancel();
    expect(getConnectionStats()).toEqual({ total: 0, users: 0 });
  });

  it("sends an initial heartbeat with the connected status", async () => {
    const chunk = await readChunk(openStream("hb-user"));
    expect(chunk).toContain("heartbeat");
    expect(chunk).toContain("connected");
  });

  it("sends keep-alive heartbeats every 30s and cleans up on cancel", async () => {
    vi.useFakeTimers();
    const reader = openStream("hb-interval");

    const first = await readChunk(reader);
    expect(first).toContain("connected");

    vi.advanceTimersByTime(30_000);
    const second = await readChunk(reader);
    expect(second).toContain("heartbeat");
    expect(second).toContain("time");

    await reader.cancel();
    expect(getConnectionStats().total).toBe(0);
  });

  it("broadcastToUser delivers only to the target user", async () => {
    const readerA = openStream("scope-a");
    const readerB = openStream("scope-b");
    await readChunk(readerA); // consume heartbeats
    await readChunk(readerB);

    broadcastToUser("scope-a", testEvent);

    const chunkA = await readChunk(readerA);
    expect(chunkA).toContain("notification");
    expect(chunkA).toContain("n1");

    // User B must NOT receive the event.
    expect(await expectNoChunk(readerB)).toBeNull();
  });

  it("broadcastToAdmins reaches only ADMIN-role clients", async () => {
    const readerAdmin = openStream("adm-1", "ADMIN");
    const readerStudent = openStream("std-1", "STUDENT");
    await readChunk(readerAdmin);
    await readChunk(readerStudent);

    broadcastToAdmins(testEvent);

    expect(await readChunk(readerAdmin)).toContain("notification");
    expect(await expectNoChunk(readerStudent)).toBeNull();
  });

  it("broadcastToAll reaches every connected client", async () => {
    const readerA = openStream("all-a");
    const readerB = openStream("all-b");
    await readChunk(readerA);
    await readChunk(readerB);

    broadcastToAll(testEvent);

    expect(await readChunk(readerA)).toContain("notification");
    expect(await readChunk(readerB)).toContain("notification");
  });

  it("notifyUser persists the notification and returns the payload", async () => {
    const user = await createTestUser(prisma, { email: "eb-user@test.com" });

    const payload = await notifyUser(user.id, {
      type: "COURSE_PUBLISHED",
      title: "Novo curso",
      message: "Seu curso foi publicado",
    });

    const row = await prisma.notification.findUnique({ where: { id: payload.id } });
    expect(row?.title).toBe("Novo curso");
    expect(row?.userId).toBe(user.id);
    expect(payload.type).toBe("COURSE_PUBLISHED");
    expect(payload.read).toBe(false);
    expect(typeof payload.createdAt).toBe("string");
  });

  it("notifyUser broadcasts the event to the user's connected stream", async () => {
    const user = await createTestUser(prisma, { email: "eb-broadcast@test.com" });
    const reader = openStream(user.id);
    await readChunk(reader);

    const payload = await notifyUser(user.id, {
      type: "ACHIEVEMENT_EARNED",
      title: "Badge",
      message: "Conquista desbloqueada",
    });

    const chunk = await readChunk(reader);
    expect(chunk).toContain("notification");
    expect(chunk).toContain(payload.id);
  });

  it("notifyAdmins creates one notification per admin and broadcasts to admins", async () => {
    const admin1 = await createTestUser(prisma, { email: "eb-adm1@test.com", role: "ADMIN" });
    const admin2 = await createTestUser(prisma, { email: "eb-adm2@test.com", role: "ADMIN" });
    const student = await createTestUser(prisma, { email: "eb-std@test.com" });

    const readerAdmin = openStream(admin1.id, "ADMIN");
    const readerStudent = openStream(student.id, "STUDENT");
    await readChunk(readerAdmin);
    await readChunk(readerStudent);

    const payloads = await notifyAdmins({
      type: "ADMIN_ALERT",
      title: "Alerta",
      message: "Novo instrutor aguardando aprovação",
    });

    expect(payloads).toHaveLength(2);
    const created = await prisma.notification.count({
      where: { type: "ADMIN_ALERT", userId: { in: [admin1.id, admin2.id] } },
    });
    expect(created).toBe(2);

    expect(await readChunk(readerAdmin)).toContain("notification");
    expect(await expectNoChunk(readerStudent)).toBeNull();
  });

  it("notifyAllStudents creates one notification per student and broadcasts", async () => {
    const s1 = await createTestUser(prisma, { email: "eb-s1@test.com" });
    const s2 = await createTestUser(prisma, { email: "eb-s2@test.com" });

    const reader = openStream(s1.id);
    await readChunk(reader);

    const payloads = await notifyAllStudents({
      type: "COURSE_PUBLISHED",
      title: "Novo curso disponível",
      message: "Confira o catálogo",
    });

    expect(payloads).toHaveLength(2);
    const created = await prisma.notification.count({
      where: { userId: { in: [s1.id, s2.id] } },
    });
    expect(created).toBe(2);
    expect(await readChunk(reader)).toContain("notification");
  });

  it("notifyAllStudents returns an empty array when there are no students", async () => {
    // beforeEach wiped the DB — no students exist.
    const payloads = await notifyAllStudents({
      type: "COURSE_PUBLISHED",
      title: "x",
      message: "y",
    });
    expect(payloads).toEqual([]);
  });
});
