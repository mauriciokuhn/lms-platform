import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { strictLimiter } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

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
    const rateCheck = strictLimiter.check(request);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.error }, { status: 429 });
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
    console.log(`🔐 Password reset requested for ${email}`);
    console.log(`   Link: ${resetLink}`);
    console.log(`   Expires: ${expires.toISOString()}`);

    const emailResult = await sendPasswordResetEmail(email, resetLink);
    if (!emailResult.success) {
      console.warn("⚠️ Email not sent:", emailResult.reason || emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message:
        "Se o email estiver cadastrado, você receberá um link de redefinição.",
    });
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json(
      { error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}
