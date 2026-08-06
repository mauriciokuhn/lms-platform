import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { subscribeSSE } from "@/lib/event-bus";

/**
 * GET /api/events/subscribe
 *
 * Opens a Server-Sent Events (SSE) stream for the authenticated user.
 * The connection stays open and the server pushes events as they occur.
 *
 * Usage (client-side):
 *   const evtSource = new EventSource("/api/events/subscribe");
 *   evtSource.onmessage = (e) => {
 *     const event = JSON.parse(e.data);
 *     if (event.type === "notification") { ... }
 *   };
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  return subscribeSSE(session.user.id, session.user.role);
}
