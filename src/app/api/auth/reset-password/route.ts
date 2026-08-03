import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { strictLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/reset-password
 *
 * Validates the reset token and updates the user's password.
 * Also deletes the used token to prevent reuse.
 */
export async function POST(request: Request) {
  try {
    // Rate limit: 5 requests per minute
    const rateCheck = strictLimiter.check(request);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.error }, { status: 429, headers: rateCheck.headers });
    }

    const body = await request.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token é obrigatório" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    // Find the token
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Token inválido ou já utilizado." },
        { status: 400 }
      );
    }

    // Check expiry
    if (verificationToken.expires < new Date()) {
      // Delete expired token
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.json(
        { error: "Token expirado. Solicite uma nova redefinição de senha." },
        { status: 400 }
      );
    }

    // Find user by email (identifier)
    const user = await db.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      // Token exists but user was deleted - clean up
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 400 }
      );
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete the used token
    await db.verificationToken.delete({ where: { token } });

    // Log the user out by deleting all their sessions (forces re-login)
    await db.session.deleteMany({ where: { userId: user.id } });

    logger.info("Password reset successful", { userId: user.id });

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso! Faça login com sua nova senha.",
    });
  } catch (error) {
    logger.error("POST /api/auth/reset-password error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Erro ao redefinir senha" },
      { status: 500 }
    );
  }
}
