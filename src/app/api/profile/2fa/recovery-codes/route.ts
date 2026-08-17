import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  RECOVERY_CODE_COUNT,
} from "@/lib/recovery-codes";

/**
 * POST /api/profile/2fa/recovery-codes
 *
 * Generates a fresh set of one-time 2FA recovery codes for the signed-in
 * user. Any previously generated codes are revoked (deleted) — a new set
 * invalidates the old one. The plaintext codes are returned exactly ONCE;
 * only their SHA-256 hashes are stored.
 *
 * Response: { codes: string[] }
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const codes = generateRecoveryCodes(RECOVERY_CODE_COUNT);
    const hashes = await Promise.all(codes.map((c) => hashRecoveryCode(c.replace("-", ""))));

    await db.$transaction([
      db.twoFactorRecoveryCode.deleteMany({ where: { userId: session.user.id } }),
      db.twoFactorRecoveryCode.createMany({
        data: hashes.map((codeHash) => ({ userId: session.user.id, codeHash })),
      }),
    ]);

    return NextResponse.json({ codes });
  } catch (error) {
    logger.error("POST /api/profile/2fa/recovery-codes error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao gerar códigos de recuperação" }, { status: 500 });
  }
}

/**
 * GET /api/profile/2fa/recovery-codes
 *
 * Returns how many valid (unused) recovery codes the user has — never the
 * codes themselves.
 *
 * Response: { remaining: number }
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const remaining = await db.twoFactorRecoveryCode.count({
      where: { userId: session.user.id, usedAt: null },
    });

    return NextResponse.json({ remaining });
  } catch (error) {
    logger.error("GET /api/profile/2fa/recovery-codes error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao buscar códigos de recuperação" }, { status: 500 });
  }
}
