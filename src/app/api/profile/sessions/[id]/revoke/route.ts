import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { SESSION_COOKIE_NAME, hashSessionToken } from "@/lib/session-token";

/**
 * POST /api/profile/sessions/[id]/revoke
 *
 * Ends a specific session of the signed-in user (the one shown in the
 * profile's session list). With JWT sessions the token is blacklisted (by
 * hash) and the middleware rejects it on the next request. The user's OWN
 * current session cannot be revoked here — use "Sair" for that.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const record = await db.loginHistory.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, sessionTokenHash: true, revokedAt: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    if (record.revokedAt) {
      return NextResponse.json({ ok: true, alreadyRevoked: true });
    }

    if (record.sessionTokenHash) {
      // Never let a user revoke the session they are currently using.
      const currentToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (currentToken) {
        const currentHash = await hashSessionToken(currentToken);
        if (currentHash === record.sessionTokenHash) {
          return NextResponse.json(
            { error: "Esta é a sessão atual. Use 'Sair' para encerrá-la." },
            { status: 400 }
          );
        }
      }
    }

    await db.loginHistory.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("POST /api/profile/sessions/[id]/revoke error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao encerrar sessão" }, { status: 500 });
  }
}
