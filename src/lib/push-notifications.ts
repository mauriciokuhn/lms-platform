/**
 * Web Push Notification Utilities
 *
 * Provides functions to:
 * - Save push subscription from browser
 * - Send push notifications to a user (all their devices)
 * - Generate VAPID keys for push messaging
 *
 * Requires:
 * - web-push npm package (installed)
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY env var
 * - VAPID_PRIVATE_KEY env var
 * - VAPID_EMAIL env var
 */

import webpush from "web-push";
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

// ──────────────────────────────────────────
// VAPID configuration (lazy, so env can be read at call time)
// ──────────────────────────────────────────

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  try {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:admin@pontodosaber.com.br",
      publicKey,
      privateKey
    );
    vapidConfigured = true;
    return true;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────
// Save subscription (stored in the PushSubscription model)
// ──────────────────────────────────────────

export async function saveSubscription(
  userId: string,
  subscription: PushSubscriptionData
) {
  try {
    await db.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
    logger.info("Push subscription saved", { userId });
    return { success: true };
  } catch (error) {
    logger.warn("Failed to persist push subscription", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false };
  }
}

// ──────────────────────────────────────────
// Remove subscription (user opted out / endpoint expired)
// ──────────────────────────────────────────

export async function removeSubscription(endpoint: string) {
  try {
    await db.pushSubscription.deleteMany({ where: { endpoint } });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ──────────────────────────────────────────
// Send push notification to a single subscription
// ──────────────────────────────────────────

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
) {
  try {
    if (!ensureVapid()) {
      logger.info("Push notification (simulated — VAPID not configured)", {
        title: payload.title,
      });
      return { success: true, simulated: true };
    }

    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 86400 } // 24h
    );

    return { success: true };
  } catch (error: unknown) {
    const err = error as { statusCode?: number } | null;
    // Subscription expired or invalid — remove from DB
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      logger.warn("Push subscription expired", { endpoint: subscription.endpoint });
      await removeSubscription(subscription.endpoint);
      return { success: false, expired: true };
    }

    logger.error("Push notification error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error };
  }
}

// ──────────────────────────────────────────
// Send push notification to a user (all their devices)
// ──────────────────────────────────────────

export async function notifyUserPush(
  userId: string,
  payload: PushPayload
): Promise<{ success: boolean; delivered: number; total: number; simulated: boolean }> {
  try {
    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) {
      logger.info("Push: no subscriptions for user", { userId });
      return { success: true, delivered: 0, total: 0, simulated: false };
    }

    let delivered = 0;
    let allSimulated = true;
    for (const sub of subscriptions) {
      const result = await sendPushNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      if (result.success && !result.simulated) {
        delivered += 1;
        allSimulated = false;
      } else if (result.success && result.simulated) {
        allSimulated = allSimulated && true;
      } else {
        allSimulated = false;
      }
    }

    logger.info("Push sent to user", { userId, delivered, total: subscriptions.length });
    return { success: true, delivered, total: subscriptions.length, simulated: subscriptions.length > 0 && allSimulated };
  } catch (error) {
    logger.error("notifyUserPush error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, delivered: 0, total: 0, simulated: false };
  }
}

// ──────────────────────────────────────────
// VAPID key generation helper
// ──────────────────────────────────────────

export async function generateVapidKeys() {
  try {
    const vapidKeys = webpush.generateVAPIDKeys();
    return {
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
    };
  } catch {
    return {
      publicKey: "Not available",
      privateKey: "Not available",
    };
  }
}
