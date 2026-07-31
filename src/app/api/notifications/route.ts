import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/notifications
 *
 * Returns the authenticated user's recent unread notifications (up to 50)
 * ordered by most recent first. Includes total unread count.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.notification.count({
        where: { userId, read: false },
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Erro ao buscar notificações" }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 *
 * Mark one or all notifications as read.
 * Body: { id?: string, all?: boolean }
 * - If `id` is provided, marks that single notification as read.
 * - If `all: true`, marks all user's notifications as read.
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    if (body.id) {
      // Mark single notification as read (must belong to the user)
      const notification = await db.notification.findUnique({
        where: { id: body.id },
        select: { userId: true },
      });

      if (!notification || notification.userId !== userId) {
        return NextResponse.json({ error: "Notificação não encontrada" }, { status: 404 });
      }

      await db.notification.update({
        where: { id: body.id },
        data: { read: true },
      });
    } else if (body.all) {
      // Mark all as read
      await db.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: "Erro ao atualizar notificações" }, { status: 500 });
  }
}
