import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveSubscription } from "@/lib/push-notifications";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Dados de inscrição incompletos" },
        { status: 400 }
      );
    }

    await saveSubscription(session.user.id, { endpoint, keys });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("POST /api/push/subscribe error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Erro ao salvar inscrição push" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return VAPID public key for client-side subscription
  return NextResponse.json({
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
  });
}
