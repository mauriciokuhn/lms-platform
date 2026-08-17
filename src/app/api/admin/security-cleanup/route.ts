import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/security-cleanup
 *
 * Housekeeping for the session history table: removes records older than
 * 90 days and revoked sessions older than 30 days (a revoked session no
 * longer protects anything — keeping only its short-term trace). Called
 * by the admin dashboard on load, like the daily security summary.
 *
 * Response: { deleted: number }
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const now = Date.now();
    const oldLogins = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const oldRevoked = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const deleted = await db.loginHistory.deleteMany({
      where: {
        OR: [
          { createdAt: { lt: oldLogins } },
          { revokedAt: { lt: oldRevoked } },
        ],
      },
    });

    return NextResponse.json({ deleted: deleted.count });
  } catch (error) {
    logger.error("POST /api/admin/security-cleanup error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro na limpeza do histórico de sessões" }, { status: 500 });
  }
}
