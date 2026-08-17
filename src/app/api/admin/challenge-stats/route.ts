import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChallengeStats } from "@/lib/login-challenge";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/challenge-stats
 *
 * Anti-bot challenge counters (aggregate + per account): how many challenges
 * were issued, solved and failed. Lets admins spot brute-force pressure on
 * specific accounts in real time. Counters are per-process (reset on
 * restart) — short-horizon monitoring by design.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    return NextResponse.json({ stats: getChallengeStats() });
  } catch (error) {
    logger.error("GET /api/admin/challenge-stats error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao buscar métricas do desafio" }, { status: 500 });
  }
}
