/**
 * Route-level tests for GET/POST /api/push/subscribe.
 *
 * Exercises the real handlers: 401 guard, body validation (400),
 * persisting a subscription via upsert, and the VAPID public key
 * exposed by GET (null when the env var is missing).
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

import { GET, POST } from "@/app/api/push/subscribe/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

const SUBSCRIPTION = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint-1",
  keys: {
    p256dh: "BEl62iUYgUivxIkv69yViEuiBIa" + "Iqb9SfEHp2RZ7U",
    auth: "aGVsbG8td29ybGQtYXV0aA",
  },
};

function postSubscription(body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request("http://localhost/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("Push subscribe route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
    vi.unstubAllEnvs();
  });

  it("GET is public (no auth) and returns the VAPID public key when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "vapid-public-key-123");
    authMock.auth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.vapidPublicKey).toBe("vapid-public-key-123");
  });

  it("GET returns null vapidPublicKey when not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    authMock.auth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.vapidPublicKey).toBeNull();
  });

  it("POST returns 401 when not authenticated", async () => {
    expect((await postSubscription(SUBSCRIPTION)).status).toBe(401);
  });

  it("POST returns 400 when the body is incomplete", async () => {
    const user = await createTestUser(prisma, { email: "push-bad@test.com" });
    const session = createMockSession({ id: user.id });

    const noEndpoint = await postSubscription(
      { keys: SUBSCRIPTION.keys },
      session
    );
    expect(noEndpoint.status).toBe(400);

    const noKeys = await postSubscription(
      { endpoint: SUBSCRIPTION.endpoint },
      session
    );
    expect(noKeys.status).toBe(400);
  });

  it("POST persists the subscription and returns success", async () => {
    const user = await createTestUser(prisma, { email: "push-save@test.com" });
    const res = await postSubscription(
      SUBSCRIPTION,
      createMockSession({ id: user.id })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const saved = await prisma.pushSubscription.findUnique({
      where: { endpoint: SUBSCRIPTION.endpoint },
    });
    expect(saved).not.toBeNull();
    expect(saved?.userId).toBe(user.id);
    expect(saved?.p256dh).toBe(SUBSCRIPTION.keys.p256dh);
    expect(saved?.auth).toBe(SUBSCRIPTION.keys.auth);
  });

  it("POST upserts when the same endpoint is registered again (keys update, owner kept)", async () => {
    const user = await createTestUser(prisma, { email: "push-upsert@test.com" });
    const session = createMockSession({ id: user.id });
    // Unique endpoint so this test owns the row from the start (the
    // endpoint used above already belongs to the "persists" test's user).
    const endpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint-upsert";

    await postSubscription({ endpoint, keys: SUBSCRIPTION.keys }, session);
    const updatedKeys = {
      p256dh: "BEl62iUYgUivxIkv69yViEuiBIa-updated",
      auth: "aGVsbG8td29ybGQtYXV0aA-updated",
    };
    const res = await postSubscription(
      { endpoint, keys: updatedKeys },
      session
    );
    expect(res.status).toBe(200);

    // One row for the endpoint — the upsert updates keys but keeps the
    // original owner (saveSubscription's update omits userId).
    const count = await prisma.pushSubscription.count({ where: { endpoint } });
    expect(count).toBe(1);

    const saved = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    expect(saved?.p256dh).toBe(updatedKeys.p256dh);
    expect(saved?.auth).toBe(updatedKeys.auth);
    expect(saved?.userId).toBe(user.id);
  });
});
