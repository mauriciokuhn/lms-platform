/**
 * Email Service
 *
 * Uses Resend (https://resend.com) to send transactional emails.
 * Falls back gracefully when RESEND_API_KEY is not configured.
 *
 * Environment variables:
 *   RESEND_API_KEY  - Resend API key (required for sending)
 *   NEXT_PUBLIC_APP_URL - Base URL for links in emails
 */

import { Resend } from "resend";
import { logger } from "@/lib/logger";

// ─── Lazy Resend client ──────────────────

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

// ─── Email Sender ────────────────────────

// Use EMAIL_FROM env var, fallback to Resend's default sandbox sender
const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailParams) {
  const resend = getResendClient();
  if (!resend) {
    logger.warn("Email disabled — RESEND_API_KEY not configured", { to });
    return { success: false, reason: "RESEND_API_KEY not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (result.error) {
      logger.error("Resend error", { error: result.error });
      return { success: false, error: result.error };
    }

    logger.info("Email sent", { to, subject });
    return { success: true, id: result.data?.id };
  } catch (error) {
    logger.error("Failed to send email", { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error };
  }
}

// ─── Templates ───────────────────────────

function baseHtml(content: string) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f4f4f5;
      padding: 32px 16px;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    }
    .header {
      background: linear-gradient(135deg, #18181b, #27272a);
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
    }
    .header p {
      color: #a1a1aa;
      font-size: 14px;
      margin-top: 4px;
    }
    .body {
      padding: 32px;
    }
    .body p {
      color: #3f3f46;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    .btn {
      display: inline-block;
      background: #18181b;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      margin: 16px 0;
    }
    .btn:hover { background: #27272a; }
    .footer {
      padding: 24px 32px;
      border-top: 1px solid #e4e4e7;
      text-align: center;
    }
    .footer p {
      color: #a1a1aa;
      font-size: 12px;
      line-height: 1.5;
    }
    .footer a {
      color: #18181b;
      text-decoration: underline;
    }
    .details {
      background: #f4f4f5;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
      font-size: 13px;
      color: #52525b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 LMS Platform</h1>
      <p>Aprendizado Online</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>
        Este é um email automático da <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://lmsplatform.com"}">LMS Platform</a>.<br />
        Se você não solicitou esta mensagem, ignore este email.<br />
        &copy; ${new Date().getFullYear()} LMS Platform. Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}

// ─── Email Types ─────────────────────────

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const content = `
    <p>Olá!</p>
    <p>Recebemos uma solicitação de redefinição de senha para sua conta na <strong>LMS Platform</strong>.</p>
    <p>Clique no botão abaixo para criar uma nova senha:</p>
    <p style="text-align: center;">
      <a href="${resetLink}" class="btn">Redefinir Senha</a>
    </p>
    <p style="font-size: 13px; color: #71717a;">
      Este link expira em <strong>1 hora</strong>.<br />
      Se você não solicitou a redefinição, ignore este email.
    </p>
    <div class="details">
      <p><strong>Link direto (caso o botão não funcione):</strong></p>
      <p style="word-break: break-all; font-size: 12px;">${resetLink}</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Redefinição de Senha - LMS Platform",
    html: baseHtml(content),
  });
}

/**
 * Send welcome email after registration
 */
export async function sendWelcomeEmail(email: string, name: string) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`;

  const content = `
    <p>Bem-vindo(a), <strong>${name || "aluno"}</strong>! 🎉</p>
    <p>Sua conta na <strong>LMS Platform</strong> foi criada com sucesso. Você agora tem acesso a:</p>
    <ul style="color: #3f3f46; font-size: 15px; line-height: 1.8; margin-bottom: 16px; padding-left: 20px;">
      <li>📚 Catálogo completo de cursos gratuitos</li>
      <li>🎥 Player de vídeo com progresso automático</li>
      <li>📝 Questionários com correção automática</li>
      <li>🏆 Gamificação (XP, badges, rankings)</li>
      <li>📜 Certificados digitais de conclusão</li>
    </ul>
    <p style="text-align: center;">
      <a href="${dashboardUrl}" class="btn">Ir para o Dashboard</a>
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "Bem-vindo à LMS Platform! 🎓",
    html: baseHtml(content),
  });
}

/**
 * Send certificate issued email
 */
export async function sendCertificateEmail(email: string, name: string, courseTitle: string, certificateUrl: string) {
  const content = `
    <p>Parabéns, <strong>${name || "aluno"}</strong>! 🎉</p>
    <p>Você concluiu com êxito o curso <strong>"${courseTitle}"</strong> e seu certificado digital já está disponível!</p>
    <p style="text-align: center;">
      <a href="${certificateUrl}" class="btn">Ver Meu Certificado</a>
    </p>
    <p style="font-size: 13px; color: #71717a;">
      Compartilhe sua conquista nas redes sociais e inspire outros alunos!<br />
      O certificado pode ser baixado em PDF ou verificado online.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `Certificado de Conclusão - ${courseTitle} 🎓`,
    html: baseHtml(content),
  });
}

/**
 * Send course published notification
 */
export async function sendCoursePublishedEmail(email: string, name: string, courseTitle: string, courseUrl: string) {
  const content = `
    <p>Olá, <strong>${name || "instrutor"}</strong>! 👋</p>
    <p>Seu curso <strong>"${courseTitle}"</strong> foi publicado com sucesso e já está disponível no catálogo da plataforma!</p>
    <p style="text-align: center;">
      <a href="${courseUrl}" class="btn">Ver Curso</a>
    </p>
    <p style="font-size: 13px; color: #71717a;">
      Continue criando conteúdo de qualidade para ajudar mais alunos a aprenderem! 🚀
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `Curso Publicado: ${courseTitle} ✅`,
    html: baseHtml(content),
  });
}

/**
 * Send course rejected notification
 */
export async function sendCourseRejectedEmail(email: string, name: string, courseTitle: string, reason: string) {
  const content = `
    <p>Olá, <strong>${name || "instrutor"}</strong>.</p>
    <p>Infelizmente seu curso <strong>"${courseTitle}"</strong> não foi aprovado na revisão.</p>
    <div class="details">
      <p><strong>Motivo:</strong> ${reason}</p>
    </div>
    <p>Você pode editar o curso e enviar novamente para revisão quando estiver pronto.</p>
    <p style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/instrutor/cursos" class="btn">Editar Curso</a>
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `Curso Não Aprovado: ${courseTitle} ❌`,
    html: baseHtml(content),
  });
}

/**
 * Verify email service configuration
 * Useful for health checks and deployment verification
 */
export async function testEmailService() {
  const resend = getResendClient();
  if (!resend) {
    return { configured: false, message: "RESEND_API_KEY not configured" };
  }

  try {
    // Try to fetch the API key info to verify it works
    const result = await resend.apiKeys.list();
    return {
      configured: true,
      message: "Resend API key is valid",
      hasApiKeys: Array.isArray(result.data) && result.data.length > 0,
    };
  } catch (error) {
    return { configured: false, message: "Resend API key is invalid", error };
  }
}
