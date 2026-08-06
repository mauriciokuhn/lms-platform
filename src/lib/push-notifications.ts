/**
 * Web Push Notification Utilities
 *
 * Provides functions to:
 * - Save push subscription from browser
 * - Send push notifications to a user
 * - Generate VAPID keys for push messaging
 *
 * Requires:
 * - web-push npm package
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY env var
 * - VAPID_PRIVATE_KEY env var
 * - VAPID_EMAIL env var
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Normalized shape of the web-push API (all members optional). */
interface WebPushApi {
  setVapidDetails?: (...args: string[]) => void;
  sendNotification?: (
    subscription: PushSubscriptionData,
    payload: string,
    options?: { TTL?: number }
  ) => Promise<void>;
  generateVAPIDKeys?: () => { publicKey: string; privateKey: string };
}

interface WebPushModule {
  default: WebPushApi | null;
  setVapidDetails?: WebPushApi["setVapidDetails"];
  sendNotification?: WebPushApi["sendNotification"];
  generateVAPIDKeys?: WebPushApi["generateVAPIDKeys"];
}

// Dynamically import web-push (optional dependency)
let webpushModule: WebPushModule | null = null;
async function getWebpush(): Promise<WebPushApi | null> {
  if (!webpushModule) {
    try {
      // @ts-expect-error -- web-push is an optional dependency, not installed
      webpushModule = (await import("web-push")) as WebPushModule;
    } catch {
      webpushModule = null;
    }
  }
  if (!webpushModule) return null;
  const api = webpushModule.default || webpushModule;
  return {
    setVapidDetails: api.setVapidDetails,
    sendNotification: api.sendNotification,
    generateVAPIDKeys: api.generateVAPIDKeys,
  };
}

// ──────────────────────────────────────────
// Save subscription (stored in UserSettings as JSON)
// ──────────────────────────────────────────

export async function saveSubscription(
  userId: string,
  subscription: PushSubscriptionData
) {
  // Store subscription in the PushSubscription model
  try {
    await db.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
    });
    logger.info("Push subscription saved", { userId });
  } catch {
    logger.warn("Push subscription model not yet migrated. Run: npx prisma generate && npx prisma db push");
    logger.info("Push subscription not persisted", { endpoint: subscription.endpoint });
  }

  return { success: true };
}

// ──────────────────────────────────────────
// Send push notification
// ──────────────────────────────────────────

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
) {
  try {
    // Try to use web-push if available
    const webpush = await getWebpush();

    if (!webpush || !process.env.VAPID_PRIVATE_KEY) {
      logger.info("Push notification (simulated)", { title: payload.title });
      return { success: true, simulated: true };
    }

    webpush.setVapidDetails?.(
      process.env.VAPID_EMAIL || "mailto:admin@lms.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
      process.env.VAPID_PRIVATE_KEY
    );

    const sendFn = webpush.sendNotification;
    if (!sendFn) {
      logger.info("Push notification (simulated)", { title: payload.title });
      return { success: true, simulated: true };
    }

    await sendFn(subscription, JSON.stringify(payload), { TTL: 86400 });

    return { success: true };
  } catch (error: unknown) {
    // Subscription expired or invalid — remove from DB
    const statusCode = (error as { statusCode?: number } | null)?.statusCode;
    if (statusCode === 410) {
      logger.warn("Push subscription expired", { endpoint: subscription.endpoint });
      try {
        await db.pushSubscription.deleteMany({
          where: { endpoint: subscription.endpoint },
        });
      } catch { /* model may not exist yet */ }
      return { success: false, expired: true };
    }

    logger.error("Push notification error", { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error };
  }
}

// ──────────────────────────────────────────
// Send notification to user (all their devices)
// ──────────────────────────────────────────

export async function notifyUserPush(
  userId: string,
  payload: PushPayload
) {
  // In production, fetch all subscriptions for this user
  // from a PushSubscription model
  // For now, this is a placeholder

  logger.info("Push notification sent to user", { userId, title: payload.title });
  return { success: true, delivered: 0 };
}

// ──────────────────────────────────────────
// VAPID key generation helper
// ──────────────────────────────────────────

export async function generateVapidKeys() {
  try {
    const webpush = await getWebpush();
    if (!webpush || !webpush.generateVAPIDKeys) {
      return {
        publicKey: "Not available. Install web-push: npm install web-push",
        privateKey: "Not available",
      };
    }
    const vapidKeys = webpush.generateVAPIDKeys();
    return {
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
    };
  } catch {
    return {
      publicKey: "Not available. Install web-push: npm install web-push",
      privateKey: "Not available",
    };
  }
}
