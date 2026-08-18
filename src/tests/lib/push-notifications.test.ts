/**
 * Unit tests for the web-push utilities (src/lib/push-notifications.ts).
 *
 * The optional `web-push` dependency and `@/lib/db` are mocked; real
 * PushSubscription rows land in the isolated test database. Covers:
 * subscription upsert (create + update), the simulated path when web-push or
 * VAPID keys are missing, the real send path (VAPID details + payload), the
 * 410 expired-subscription cleanup, generic errors, notifyUserPush and
 * generateVapidKeys (available and unavailable).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));
vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const setVapidDetailsMock = vi.hoisted(() => vi.fn());
const sendNotificationMock = vi.hoisted(() => vi.fn());
const generateVAPIDKeysMock = vi.hoisted(() => vi.fn());

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: setVapidDetailsMock,
    sendNotification: sendNotificationMock,
    generateVAPIDKeys: generateVAPIDKeysMock,
  },
}));

import {
  saveSubscription,
  sendPushNotification,
  notifyUserPush,
  generateVapidKeys,
} from "@/lib/push-notifications";
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser } from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

const SUBSCRIPTION = {
  endpoint: "https://fcm.googleapis.com/push/abc123",
  keys: { p256dh: "p256dh-key", auth: "auth-key" },
};

const PAYLOAD = { title: "Novo curso", body: "Confira!", url: "/cursos/c1" };

describe("push notifications", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    setVapidDetailsMock.mockReset();
    sendNotificationMock.mockReset();
    generateVAPIDKeysMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("persists a push subscription (create)", async () => {
    const user = await createTestUser(prisma, { email: "push-create@test.com" });

    const result = await saveSubscription(user.id, SUBSCRIPTION);

    expect(result.success).toBe(true);
    const row = await prisma.pushSubscription.findUnique({
      where: { endpoint: SUBSCRIPTION.endpoint },
    });
    expect(row?.userId).toBe(user.id);
    expect(row?.p256dh).toBe("p256dh-key");
    expect(row?.auth).toBe("auth-key");
  });

  it("updates an existing subscription for the same endpoint", async () => {
    const user = await createTestUser(prisma, { email: "push-update@test.com" });
    await saveSubscription(user.id, SUBSCRIPTION);

    await saveSubscription(user.id, {
      ...SUBSCRIPTION,
      keys: { p256dh: "new-key", auth: "new-auth" },
    });

    const rows = await prisma.pushSubscription.findMany({
      where: { endpoint: SUBSCRIPTION.endpoint },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].p256dh).toBe("new-key");
    expect(rows[0].auth).toBe("new-auth");
  });

  it("simulates the push when VAPID_PRIVATE_KEY is missing", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");

    const result = await sendPushNotification(SUBSCRIPTION, PAYLOAD);

    expect(result).toEqual({ success: true, simulated: true });
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("sends a real push with VAPID details and TTL", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
    vi.stubEnv("VAPID_EMAIL", "mailto:dev@lms.com");
    sendNotificationMock.mockResolvedValue(undefined);

    const result = await sendPushNotification(SUBSCRIPTION, PAYLOAD);

    expect(result).toEqual({ success: true });
    expect(setVapidDetailsMock).toHaveBeenCalledWith(
      "mailto:dev@lms.com",
      "public-key",
      "private-key"
    );
    expect(sendNotificationMock).toHaveBeenCalledWith(
      SUBSCRIPTION,
      JSON.stringify(PAYLOAD),
      { TTL: 86400 }
    );
  });

  it("removes the subscription and reports expired on a 410", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
    const user = await createTestUser(prisma, { email: "push-410@test.com" });
    await saveSubscription(user.id, SUBSCRIPTION);

    sendNotificationMock.mockRejectedValue({ statusCode: 410 });

    const result = await sendPushNotification(SUBSCRIPTION, PAYLOAD);

    expect(result).toEqual({ success: false, expired: true });
    const remaining = await prisma.pushSubscription.count({
      where: { endpoint: SUBSCRIPTION.endpoint },
    });
    expect(remaining).toBe(0);
  });

  it("returns the error for generic send failures", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
    const boom = new Error("network");
    sendNotificationMock.mockRejectedValue(boom);

    const result = await sendPushNotification(SUBSCRIPTION, PAYLOAD);

    expect(result.success).toBe(false);
    expect(result.expired).toBeUndefined();
    expect(result.error).toBe(boom);
  });

  it("notifyUserPush reports zero deliveries when the user has no subscriptions", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    const result = await notifyUserPush("user-1", PAYLOAD);
    expect(result).toEqual({ success: true, delivered: 0, total: 0, simulated: false });
  });

  it("notifyUserPush delivers to all the user's subscriptions (real send)", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
    const user = await createTestUser(prisma, { email: "push-multi@test.com" });
    await saveSubscription(user.id, SUBSCRIPTION);
    await saveSubscription(user.id, {
      endpoint: "https://fcm.googleapis.com/push/xyz789",
      keys: { p256dh: "p256dh-2", auth: "auth-2" },
    });
    sendNotificationMock.mockResolvedValue(undefined);

    const result = await notifyUserPush(user.id, PAYLOAD);

    expect(result).toEqual({ success: true, delivered: 2, total: 2, simulated: false });
    expect(sendNotificationMock).toHaveBeenCalledTimes(2);
  });

  it("notifyUserPush marks the delivery as simulated when VAPID is not configured", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    const user = await createTestUser(prisma, { email: "push-sim@test.com" });
    await saveSubscription(user.id, SUBSCRIPTION);

    const result = await notifyUserPush(user.id, PAYLOAD);

    expect(result.success).toBe(true);
    expect(result.delivered).toBe(0);
    expect(result.total).toBe(1);
    expect(result.simulated).toBe(true);
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("notifyUserPush cleans up expired subscriptions (410) during fan-out", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "private-key");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "public-key");
    const user = await createTestUser(prisma, { email: "push-expired@test.com" });
    await saveSubscription(user.id, SUBSCRIPTION);
    sendNotificationMock.mockRejectedValue({ statusCode: 410 });

    const result = await notifyUserPush(user.id, PAYLOAD);

    expect(result.success).toBe(true);
    expect(result.delivered).toBe(0);
    expect(result.total).toBe(1);
    const remaining = await prisma.pushSubscription.count({
      where: { userId: user.id },
    });
    expect(remaining).toBe(0);
  });

  it("generates VAPID keys when web-push is available", async () => {
    generateVAPIDKeysMock.mockReturnValue({ publicKey: "pub", privateKey: "priv" });

    const keys = await generateVapidKeys();
    expect(keys).toEqual({ publicKey: "pub", privateKey: "priv" });
  });

  it("reports unavailable keys when web-push cannot generate them", async () => {
    generateVAPIDKeysMock.mockReturnValue(undefined);

    const keys = await generateVapidKeys();
    expect(keys.publicKey).toContain("Not available");
    expect(keys.privateKey).toContain("Not available");
  });
});
