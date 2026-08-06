/**
 * Unit tests for the email service (src/lib/email.ts).
 *
 * Covers both paths:
 *  1. Fallback — RESEND_API_KEY unset: every sender returns
 *     { success: false, reason: "RESEND_API_KEY not configured" } and no
 *     network happens.
 *  2. Resend — RESEND_API_KEY set: the `resend` package is mocked so no
 *     network is involved; success, API error and thrown-error branches are
 *     exercised, plus testEmailService.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());
const listMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: sendMock },
    apiKeys: { list: listMock },
  })),
}));

// Imported AFTER the mock so `resend` resolves to the stub above.
import {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendCertificateEmail,
  sendCoursePublishedEmail,
  sendCourseRejectedEmail,
  testEmailService,
} from "@/lib/email";

describe("email service — fallback (no RESEND_API_KEY)", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
    vi.stubEnv("NODE_ENV", "development"); // let the logger emit quietly
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // NOTE: no vi.restoreAllMocks() here — it would also restore the
    // mocked Resend class implementation from the vi.mock factory,
    // breaking the tests that follow.
  });

  it("password reset email returns the not-configured result", async () => {
    const result = await sendPasswordResetEmail("user@example.com", "https://app/redefinir-senha/token");
    expect(result.success).toBe(false);
    expect(result.reason).toBe("RESEND_API_KEY not configured");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("welcome email does not call Resend when unconfigured", async () => {
    const result = await sendWelcomeEmail("user@example.com", "Maria");
    expect(result.success).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("certificate email does not call Resend when unconfigured", async () => {
    const result = await sendCertificateEmail("user@example.com", "Maria", "React", "https://app/cert/1");
    expect(result.success).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("course published email does not call Resend when unconfigured", async () => {
    const result = await sendCoursePublishedEmail("inst@example.com", "Lucas", "Node.js", "https://app/cursos/1");
    expect(result.success).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("course rejected email does not call Resend when unconfigured", async () => {
    const result = await sendCourseRejectedEmail("inst@example.com", "Lucas", "Node.js", "conteúdo incompleto");
    expect(result.success).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("testEmailService reports not configured", async () => {
    const result = await testEmailService();
    expect(result.configured).toBe(false);
    expect(result.message).toContain("RESEND_API_KEY");
  });
});

describe("email service — Resend path (mock)", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "noreply@lms.com";
    sendMock.mockReset();
    listMock.mockReset();
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    // NOTE: no vi.restoreAllMocks() here (see above).
  });

  it("sends a password reset email and returns the id", async () => {
    sendMock.mockResolvedValue({ data: { id: "msg_123" }, error: null });
    const result = await sendPasswordResetEmail("user@example.com", "https://app/redefinir-senha/abc123");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [payload] = sendMock.mock.calls[0];
    expect(payload.to).toBe("user@example.com");
    expect(payload.from).toBe("noreply@lms.com");
    expect(payload.subject).toContain("Redefinição de Senha");
    expect(payload.html).toContain("https://app/redefinir-senha/abc123");
    expect(result.success).toBe(true);
    expect(result.id).toBe("msg_123");
  });

  it("surfaces an API error from Resend", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "rate limited" } });
    const result = await sendWelcomeEmail("user@example.com", "Maria");
    expect(result.success).toBe(false);
    expect(result.error).toEqual({ message: "rate limited" });
  });

  it("catches a thrown error and returns it", async () => {
    sendMock.mockRejectedValue(new Error("connection reset"));
    const result = await sendWelcomeEmail("user@example.com", "Maria");
    expect(result.success).toBe(false);
    expect((result.error as Error).message).toBe("connection reset");
  });

  it("welcome email embeds the name and dashboard link", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.lms.com";
    sendMock.mockResolvedValue({ data: { id: "w1" }, error: null });
    await sendWelcomeEmail("user@example.com", "Maria");

    const [payload] = sendMock.mock.calls[0];
    expect(payload.html).toContain("Maria");
    expect(payload.html).toContain("https://app.lms.com/dashboard");
  });

  it("testEmailService reports configured when the key lists ok", async () => {
    listMock.mockResolvedValue({ data: [{ id: "1" }], error: null });
    const result = await testEmailService();
    expect(result.configured).toBe(true);
    expect(result.hasApiKeys).toBe(true);
  });

  it("testEmailService reports invalid when the key check throws", async () => {
    listMock.mockRejectedValue(new Error("unauthorized"));
    const result = await testEmailService();
    expect(result.configured).toBe(false);
    expect(result.message).toContain("invalid");
  });
});
