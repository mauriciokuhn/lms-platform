import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/sessions/[id]/revoke
 *
 * Ends a student's session (admin only). Unlike the profile endpoint there
 * is no "current session" guard — an admin may end any session, including
 * the one the student is using right now (they get bounced to /login on the
 * next request by the proxy).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const record = await db.loginHistory.findUnique({
      where: { id },
      select: { id: true, revokedAt: true, user: { select: { id: true, email: true } } },
    });

    if (!record) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    if (record.revokedAt) {
      return NextResponse.json({ ok: true, alreadyRevoked: true });
    }

    await db.loginHistory.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("POST /api/admin/sessions/[id]/revoke error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao encerrar sessão" }, { status: 500 });
  }
}
