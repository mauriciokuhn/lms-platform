import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { strictLimiter } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/forgot-password
 *
 * Generates a password reset token and stores it in the VerificationToken model.
 * In production, this would send an email with the reset link.
 * For development, the token is logged to the console.
 */
export async function POST(request: Request) {
  try {
    // Rate limit: 5 requests per minute
    const rateCheck = await strictLimiter.check(request);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.error }, { status: 429, headers: rateCheck.headers });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal whether the email exists (security best practice)
      return NextResponse.json({
        success: true,
        message:
          "Se o email estiver cadastrado, você receberá um link de redefinição.",
      });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Store the token in VerificationToken model
    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Build reset link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/redefinir-senha/${token}`;

    // ── Send email via Resend ──
    // Log WITHOUT the reset link/token (sensitive). The e-mail body carries
    // the link; the log only records that a request happened.
    logger.info("Password reset requested", { email, expiresAt: expires.toISOString() });

    const emailResult = await sendPasswordResetEmail(email, resetLink);
    if (!emailResult.success) {
      logger.warn("Password reset email not sent", { reason: String(emailResult.reason || emailResult.error) });
    }

    return NextResponse.json({
      success: true,
      message:
        "Se o email estiver cadastrado, você receberá um link de redefinição.",
    });
  } catch (error) {
    logger.error("POST /api/auth/forgot-password error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}
