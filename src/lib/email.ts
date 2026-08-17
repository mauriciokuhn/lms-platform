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

// Use EMAIL_FROM env var, fallback to Resend's default sandbox sender.
// Read lazily so tests can set the env before each call.
function getFromEmail() {
  return process.env.EMAIL_FROM || "onboarding@resend.dev";
}

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
      from: getFromEmail(),
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
      border-top: 4px solid #f59e0b;
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
    .seal {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #fbbf24, #d97706);
      font-size: 26px;
      line-height: 1;
      margin-bottom: 12px;
      border: 3px solid rgba(255, 255, 255, 0.9);
      box-shadow: 0 6px 18px rgba(217, 119, 6, 0.35);
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
      <div class="seal">💡</div>
      <h1>Ponto do Saber</h1>
      <p>Aprendizado Online</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>
        Este é um email automático da <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://lmsplatform.com"}">Ponto do Saber</a>.<br />
        Se você não solicitou esta mensagem, ignore este email.<br />
        &copy; ${new Date().getFullYear()} Ponto do Saber. Todos os direitos reservados.
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
    <p>Recebemos uma solicitação de redefinição de senha para sua conta na <strong>Ponto do Saber</strong>.</p>
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
    subject: "Redefinição de Senha - Ponto do Saber",
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
    <p>Sua conta na <strong>Ponto do Saber</strong> foi criada com sucesso. Você agora tem acesso a:</p>
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
    subject: "Bem-vindo ao Ponto do Saber! 🎓",
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
 * Warns the account owner that their login was temporarily locked after
 * many consecutive failed attempts — so an attacker can't silently lock a
 * legitimate account without the owner noticing. Links to password reset.
 */
export async function sendAccountLockedEmail(email: string, lockMinutes: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const content = `
    <p>Olá!</p>
    <p>Detectamos <strong>muitas tentativas de login falhas</strong> na sua conta da <strong>Ponto do Saber</strong>.</p>
    <p>Por segurança, o login foi <strong>bloqueado temporariamente por ${lockMinutes} minuto${lockMinutes === 1 ? "" : "s"}</strong>.</p>
    <p>Se foi você, aguarde o bloqueio expirar e tente novamente. Se você esqueceu a senha, redefina-a abaixo:</p>
    <p style="text-align: center;">
      <a href="${baseUrl}/esqueci-senha" class="btn">Redefinir Senha</a>
    </p>
    <p style="font-size: 13px; color: #71717a;">
      Se você não tentou entrar na sua conta, <strong>mude sua senha imediatamente</strong> — alguém pode estar tentando acessá-la.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "🔒 Login bloqueado temporariamente — Ponto do Saber",
    html: baseHtml(content),
  });
}

/**
 * Sends the 2FA verification code. The code is short-lived (5 min) and
 * single-use — it is the password equivalent for the second step.
 */
export async function sendTwoFactorEmail(email: string, code: string) {
  const content = `
    <p>Olá!</p>
    <p>Use o código abaixo para concluir seu login na <strong>Ponto do Saber</strong>:</p>
    <p style="text-align: center; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #18181b;">${code}</p>
    <p style="font-size: 13px; color: #71717a;">
      O código expira em <strong>5 minutos</strong> e só pode ser usado uma vez.
      Se você não tentou entrar, ignore este e-mail.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "🔐 Seu código de verificação — Ponto do Saber",
    html: baseHtml(content),
  });
}

/**
 * Warns the account owner that a successful login just happened from a
 * network/device this account hasn't used in the last 30 days. The raw IP
 * is never stored or sent — only a rough network hint. Fire-and-forget:
 * the login response must never depend on an email round-trip.
 */
export async function sendNewLoginEmail(email: string, when: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const content = `
    <p>Olá!</p>
    <p>Detectamos um <strong>novo login na sua conta</strong> da <strong>Ponto do Saber</strong> em <strong>${when}</strong>.</p>
    <p>O acesso veio de um <strong>dispositivo ou rede diferente</strong> dos que você costuma usar.</p>
    <p style="text-align: center;">
      <a href="${baseUrl}/esqueci-senha" class="btn">Redefinir Senha</a>
    </p>
    <p style="font-size: 13px; color: #71717a;">
      Se foi você, ignore este e-mail. Se <strong>não</strong> foi você, alguém pode ter acessado sua conta —
      <strong>mude sua senha imediatamente</strong>.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "🆕 Novo login na sua conta — Ponto do Saber",
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
 * Send streak-at-risk reminder email (no lesson completed today while
 * the user has an active streak). Uses the amber brand seal.
 */
export async function sendStreakAtRiskEmail(email: string, name: string, streak: number) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const content = `
    <p>Olá, <strong>${name || "aluno"}</strong>! 🔥</p>
    <p>Seu streak de <strong>${streak} ${streak === 1 ? "dia" : "dias"}</strong> está em risco!</p>
    <p>Você ainda não completou nenhuma aula hoje. Complete <strong>1 aula</strong> até o fim do dia para não perder sua sequência de estudos.</p>
    <p style="text-align: center;">
      <a href="${baseUrl}/meus-cursos" class="btn">Continuar Estudando</a>
    </p>
    <p style="font-size: 13px; color: #71717a;">
      Se você já estudou hoje, ignore este email. 💪
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `🔥 Streak em risco — complete 1 aula hoje (${streak} ${streak === 1 ? "dia" : "dias"})`,
    html: baseHtml(content),
  });
}

/**
 * Send monthly study summary email — stats for the previous calendar month.
 */
export async function sendMonthlySummaryEmail(
  email: string,
  name: string,
  stats: {
    monthLabel: string;
    lessons: number;
    xp: number;
    badges: number;
    coursesCompleted: number;
    streak: number;
  }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const content = `
    <p>Olá, <strong>${name || "aluno"}</strong>! 📊</p>
    <p>Seu resumo de estudos de <strong>${stats.monthLabel}</strong>:</p>
    <div class="details">
      <p>📚 <strong>${stats.lessons}</strong> ${stats.lessons === 1 ? "aula concluída" : "aulas concluídas"}</p>
      <p>⭐ <strong>+${stats.xp} XP</strong> ganhos no mês</p>
      <p>🏅 <strong>${stats.badges}</strong> ${stats.badges === 1 ? "conquista desbloqueada" : "conquistas desbloqueadas"}</p>
      ${stats.coursesCompleted > 0 ? `<p>🎓 <strong>${stats.coursesCompleted}</strong> ${stats.coursesCompleted === 1 ? "curso concluído" : "cursos concluídos"}</p>` : ""}
      ${stats.streak > 0 ? `<p>🔥 Streak atual de <strong>${stats.streak}</strong> ${stats.streak === 1 ? "dia" : "dias"}</p>` : ""}
    </div>
    <p>Continue assim — cada aula conta para o seu progresso! 🚀</p>
    <p style="text-align: center;">
      <a href="${baseUrl}/dashboard" class="btn">Ver Meu Dashboard</a>
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `📊 Seu resumo mensal — ${stats.monthLabel}`,
    html: baseHtml(content),
  });
}

/**
 * Sends the admin's daily security digest: the day's login volume and any
 * sessions that were revoked remotely (by the owner or by an admin).
 * Triggered once per day from the admin dashboard — no cron needed.
 */
export async function sendSecurityDailySummaryEmail(
  email: string,
  summary: {
    dateLabel: string;
    logins: number;
    distinctUsers: number;
    revokedSessions: { userEmail: string; when: string }[];
  }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const revokedLines =
    summary.revokedSessions.length > 0
      ? summary.revokedSessions
          .slice(0, 10)
          .map(
            (s) =>
              `<p style="margin:2px 0;">• <strong>${s.userEmail}</strong> — ${s.when}</p>`
          )
          .join("")
      : "<p style=\"margin:2px 0;\">Nenhuma sessão encerrada remotamente hoje.</p>";

  const content = `
    <p>Olá! 👋</p>
    <p>Resumo de segurança da <strong>Ponto do Saber</strong> em <strong>${summary.dateLabel}</strong>:</p>
    <div class="details">
      <p>🔑 <strong>${summary.logins}</strong> ${summary.logins === 1 ? "login registrado" : "logins registrados"} (${summary.distinctUsers} ${summary.distinctUsers === 1 ? "usuário" : "usuários"} diferentes)</p>
      <p>🚫 <strong>${summary.revokedSessions.length}</strong> ${summary.revokedSessions.length === 1 ? "sessão encerrada" : "sessões encerradas"} remotamente</p>
    </div>
    <p><strong>Sessões encerradas:</strong></p>
    ${revokedLines}
    <p style="text-align: center;">
      <a href="${baseUrl}/admin/alunos" class="btn">Gerenciar Sessões</a>
    </p>
    <p style="font-size: 13px; color: #71717a;">
      IPs são armazenados apenas como hash — nunca o endereço real.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `🛡️ Resumo Diário de Segurança — ${summary.dateLabel}`,
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
