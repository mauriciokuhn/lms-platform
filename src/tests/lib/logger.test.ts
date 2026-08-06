/**
 * Unit tests for the structured logger (src/lib/logger.ts).
 *
 * The logger emits single-line JSON entries (ts + level + message + meta)
 * and redacts sensitive values — passwords, tokens, secrets, reset links and
 * standalone e-mails — before anything reaches the console.
 *
 * Note: `emit` short-circuits when NODE_ENV === "test", so each test stubs
 * NODE_ENV to "development" to observe real output.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logger } from "@/lib/logger";

function lastCallArgs(spy: ReturnType<typeof vi.spyOn>): string {
  const calls = spy.mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return String(calls[calls.length - 1][0]);
}

function parseEmitted(spy: ReturnType<typeof vi.spyOn>): {
  ts: string;
  level: string;
  message: string;
  [key: string]: unknown;
} {
  return JSON.parse(lastCallArgs(spy));
}

describe("logger", () => {
  let consoleLog: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Let the logger actually emit (it skips output in the "test" env).
    vi.stubEnv("NODE_ENV", "development");
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("emits a JSON line with ts, level and message", () => {
    logger.info("Hello world");
    const entry = parseEmitted(consoleLog);
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("Hello world");
    expect(new Date(entry.ts as string).getTime()).not.toBeNaN();
  });

  it("routes levels to the right console method", () => {
    logger.error("boom");
    logger.warn("careful");
    logger.debug("verbose");
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    // debug goes through console.log (non-error/non-warn path)
    expect(consoleLog).toHaveBeenCalledTimes(1);
  });

  it("does not emit anything when NODE_ENV is test", () => {
    vi.stubEnv("NODE_ENV", "test");
    logger.info("should be suppressed");
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  // ── Redaction ──────────────────────────────────────────────────────────

  it("redacts passwords by key name", () => {
    logger.info("user created", { password: "super-secret-123" });
    const raw = lastCallArgs(consoleLog);
    expect(raw).not.toContain("super-secret-123");
    expect(raw).toContain("[REDACTED]");
  });

  it("redacts tokens and secrets by key name", () => {
    logger.info("request", {
      resetToken: "abcdef1234567890",
      secretKey: "sk_live_verylongvalue",
    });
    const raw = lastCallArgs(consoleLog);
    expect(raw).not.toContain("abcdef1234567890");
    expect(raw).not.toContain("sk_live_verylongvalue");
    expect(raw).toContain("[REDACTED]");
  });

  it("redacts short sensitive values with ***", () => {
    logger.info("auth", { password: "123" });
    const raw = lastCallArgs(consoleLog);
    expect(raw).toContain("***");
    expect(raw).not.toContain("123");
  });

  it("masks standalone e-mail addresses", () => {
    logger.info("signup", { email: "john.doe@mail.com" });
    const raw = lastCallArgs(consoleLog);
    expect(raw).not.toContain("john.doe@mail.com");
    expect(raw).toContain("jo***@mail.com");
  });

  it("masks e-mails even under non-obvious keys", () => {
    logger.info("invite", { recipient: "ana.silva@example.org" });
    const raw = lastCallArgs(consoleLog);
    expect(raw).not.toContain("ana.silva@example.org");
    expect(raw).toContain("an***@example.org");
  });

  it("masks emails with a single-character prefix as ***@***", () => {
    logger.info("invite", { email: "a@b.com" });
    const raw = lastCallArgs(consoleLog);
    expect(raw).not.toContain("a@b.com");
    expect(raw).toContain("***@***");
  });

  it("redacts non-string sensitive values with [REDACTED]", () => {
    logger.info("auth", { password: 12345, token: null });
    const raw = lastCallArgs(consoleLog);
    expect(raw).not.toContain("12345");
    expect(raw).toContain("[REDACTED]");
  });

  it("redacts exactly-8-char sensitive values with ***", () => {
    logger.info("auth", { token: "abcdefgh" });
    const raw = lastCallArgs(consoleLog);
    expect(raw).not.toContain("abcdefgh");
    expect(raw).toContain("***");
  });

  it("matches sensitive keys case-insensitively", () => {
    logger.info("auth", { Password: "SuperSecret99", ApiKey: "key-1234" });
    const raw = lastCallArgs(consoleLog);
    expect(raw).not.toContain("SuperSecret99");
    expect(raw).not.toContain("key-1234");
    expect(raw).toContain("[REDACTED]");
  });

  it("redacts password-reset links", () => {
    logger.info("mail", {
      link: "https://lms.app/redefinir-senha/1a2b3c4d5e6f7a8b9c0d",
    });
    const raw = lastCallArgs(consoleLog);
    expect(raw).not.toContain("1a2b3c4d5e6f7a8b9c0d");
    expect(raw).toContain("/redefinir-senha/[REDACTED]");
  });

  it("keeps non-sensitive values intact", () => {
    logger.info("course published", {
      courseId: "cm123",
      modules: 4,
      published: true,
    });
    const entry = parseEmitted(consoleLog);
    expect(entry.courseId).toBe("cm123");
    expect(entry.modules).toBe(4);
    expect(entry.published).toBe(true);
  });

  it("keeps prose (messages containing spaces) unmasked even with an e-mail", () => {
    // The masking rule only applies to standalone e-mail values, not prose.
    logger.info("report", { note: "contact john.doe@mail.com for details" });
    const raw = lastCallArgs(consoleLog);
    expect(raw).toContain("john.doe@mail.com");
  });

  it("serializes non-serializable meta without throwing", () => {
    const circular: Record<string, unknown> = { name: "self" };
    circular.self = circular;
    logger.warn("circular", { circular });
    // JSON.stringify drops circular refs (becomes {}); must not throw.
    expect(consoleWarn).toHaveBeenCalledTimes(1);
  });
});
