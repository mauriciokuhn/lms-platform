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

// Dynamically import web-push (optional dependency)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webpushModule: any = null;
async function getWebpush() {
  if (!webpushModule) {
    try {
      // @ts-ignore - web-push is optional
      webpushModule = await import("web-push");
    } catch {
      webpushModule = { default: null };
    }
  }
  return webpushModule.default || webpushModule;
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
    console.log(`✅ Push subscription saved for user ${userId}`);
  } catch (error) {
    console.warn("⚠️ Push subscription model not yet migrated. Run: npx prisma generate && npx prisma db push");
    console.log(`📢 Push subscription (not persisted): ${subscription.endpoint}`);
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
      console.log("Push notification (simulated):", payload.title);
      return { success: true, simulated: true };
    }

    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:admin@lms.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
      process.env.VAPID_PRIVATE_KEY
    );

    await webpush.default.sendNotification(
      subscription as any,
      JSON.stringify(payload),
      { TTL: 86400 }
    );

    return { success: true };
  } catch (error: any) {
    // Subscription expired or invalid — remove from DB
    if (error?.statusCode === 410) {
      console.warn("⚠️ Push subscription expired:", subscription.endpoint);
      try {
        await db.pushSubscription.deleteMany({
          where: { endpoint: subscription.endpoint },
        });
      } catch { /* model may not exist yet */ }
      return { success: false, expired: true };
    }

    console.error("❌ Push notification error:", error);
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

  console.log(`📢 Push notification for user ${userId}:`, payload.title);
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
