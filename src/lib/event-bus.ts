/**
 * SSE Event Bus — manages Server-Sent Event connections and broadcasts.
 *
 * Architecture:
 *   Connected clients register with their userId.
 *   When an event occurs, the bus pushes JSON-encoded SSE data events
 *   to every active connection for the target recipient(s).
 *
 * Three broadcast modes:
 *   1. broadcastToUser(userId, event)       → one specific user
 *   2. broadcastToAll(event)                 → every connected client
 *   3. broadcastToAdmins(event)              → every connected admin user
 *
 * The bus also writes notifications to the database so they survive
 * page reloads and can be fetched via REST.
 */

import { db } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma/client";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

export interface SSEEvent {
  type: "notification" | "heartbeat";
  payload: unknown;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

// ──────────────────────────────────────────
// In-memory connection store
// ──────────────────────────────────────────

interface Client {
  userId: string;
  role: string;
  controller: ReadableStreamDefaultController;
}

const clients = new Map<string, Client[]>();

const encoder = new TextEncoder();

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function sseData(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function cleanupClient(userId: string, controller: ReadableStreamDefaultController) {
  const list = clients.get(userId);
  if (!list) return;
  const filtered = list.filter((c) => c.controller !== controller);
  if (filtered.length === 0) {
    clients.delete(userId);
  } else {
    clients.set(userId, filtered);
  }
}

// ──────────────────────────────────────────
// Public API
// ──────────────────────────────────────────

/**
 * Returns a `Response` that keeps the connection open for SSE.
 * Call this from your `/api/events/subscribe` route handler.
 */
export function subscribeSSE(
  userId: string,
  role: string
): Response {
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let streamController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;

      const client: Client = {
        userId,
        role,
        controller,
      };

      // Register client
      const existing = clients.get(userId) || [];
      existing.push(client);
      clients.set(userId, existing);

      // Send initial heartbeat
      controller.enqueue(encoder.encode(sseData({ type: "heartbeat", payload: { status: "connected" } })));

      // Keep-alive interval (every 30s)
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(sseData({ type: "heartbeat", payload: { time: Date.now() } })));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
          cleanupClient(userId, controller);
        }
      }, 30000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (streamController) cleanupClient(userId, streamController);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Broadcast an event to a specific user's connected SSE clients.
 */
export function broadcastToUser(userId: string, event: SSEEvent) {
  const list = clients.get(userId);
  if (!list) return;
  const data = sseData(event);
  for (const client of list) {
    try {
      client.controller.enqueue(encoder.encode(data));
    } catch {
      cleanupClient(client.userId, client.controller);
    }
  }
}

/**
 * Broadcast an event to ALL connected clients.
 */
export function broadcastToAll(event: SSEEvent) {
  for (const [, list] of clients) {
    const data = sseData(event);
    for (const client of list) {
      try {
        client.controller.enqueue(encoder.encode(data));
      } catch {
        cleanupClient(client.userId, client.controller);
      }
    }
  }
}

/**
 * Broadcast an event to all connected ADMIN clients.
 */
export function broadcastToAdmins(event: SSEEvent) {
  for (const [, list] of clients) {
    const data = sseData(event);
    for (const client of list) {
      if (client.role !== "ADMIN") continue;
      try {
        client.controller.enqueue(encoder.encode(data));
      } catch {
        cleanupClient(client.userId, client.controller);
      }
    }
  }
}

/**
 * Create a notification in the database AND broadcast it via SSE
 * to the target user.
 *
 * Returns the created notification payload (for the UI to update
 * optimistically if needed).
 */
export async function notifyUser(
  userId: string,
  data: {
    type: string;
    title: string;
    message: string;
    link?: string;
  }
): Promise<NotificationPayload> {
  const notification = await db.notification.create({
    data: {
      type: data.type as NotificationType,
      title: data.title,
      message: data.message,
      link: data.link || null,
      userId,
    },
  });

  const payload: NotificationPayload = {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };

  broadcastToUser(userId, {
    type: "notification",
    payload,
  });

  return payload;
}

/**
 * Create a notification for all admin users and broadcast it.
 */
export async function notifyAdmins(
  data: {
    type: string;
    title: string;
    message: string;
    link?: string;
  }
): Promise<NotificationPayload[]> {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  const notifications = await Promise.all(
    admins.map((admin) =>
      db.notification.create({
        data: {
          type: data.type as NotificationType,
          title: data.title,
          message: data.message,
          link: data.link || null,
          userId: admin.id,
        },
      })
    )
  );

  const payloads: NotificationPayload[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  // Broadcast to all connected admins
  const event: SSEEvent = { type: "notification", payload: payloads };
  broadcastToAdmins(event);

  return payloads;
}

/**
 * Create a notification for ALL students and broadcast to connected ones.
 */
export async function notifyAllStudents(
  data: {
    type: string;
    title: string;
    message: string;
    link?: string;
  }
): Promise<NotificationPayload[]> {
  const students = await db.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true },
  });

  if (students.length === 0) return [];

  const notifications = await Promise.all(
    students.map((student) =>
      db.notification.create({
        data: {
          type: data.type as NotificationType,
          title: data.title,
          message: data.message,
          link: data.link || null,
          userId: student.id,
        },
      })
    )
  );

  const payloads: NotificationPayload[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  // Broadcast to all connected clients
  const event: SSEEvent = { type: "notification", payload: payloads };
  broadcastToAll(event);

  return payloads;
}

/**
 * Get active connection stats (for monitoring/debugging).
 */
export function getConnectionStats(): { total: number; users: number } {
  let total = 0;
  for (const [, list] of clients) {
    total += list.length;
  }
  return { total, users: clients.size };
}
