/**
 * Structured application logger.
 *
 * Emits single-line JSON entries (timestamp + level + message + meta) so
 * logs can be filtered/ingested in production (Vercel, Docker, etc.).
 * Sensitive values — passwords, tokens, secrets, full e-mails and reset
 * links — are redacted before anything reaches the console.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("Password reset requested", { email });
 *   logger.error("Webhook failed", { error: err instanceof Error ? err.message : String(err) });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LoggerMeta = Record<string, unknown>;

const SENSITIVE_KEY_PARTS = [
  "password",
  "token",
  "secret",
  "authorization",
  "credential",
  "reset",
  "apikey",
  "api_key",
];

/** Masks "john.doe@mail.com" → "jo***@mail.com". */
function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at <= 1) return "***@***";
  return `${value.slice(0, 2)}***${value.slice(at)}`;
}

function redactValue(key: string, value: unknown): unknown {
  const k = key.toLowerCase();

  // Keys that are inherently sensitive (password, token, resetLink, ...).
  if (SENSITIVE_KEY_PARTS.some((part) => k.includes(part))) {
    if (typeof value === "string" && value.length > 0) {
      return value.length > 8 ? `${value.slice(0, 4)}…[REDACTED]` : "***";
    }
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    // Never expose full password-reset links (they embed a bearer token).
    const RESET_LINK = /(\/redefinir-senha\/)[a-f0-9]{8,}/i;
    if (RESET_LINK.test(value)) {
      return value.replace(RESET_LINK, "$1[REDACTED]");
    }
    // Mask e-mail addresses in standalone values (not prose).
    if (/\S+@\S+\.\S+/.test(value) && !/\s/.test(value)) {
      return maskEmail(value);
    }
  }

  return value;
}

function redact(meta?: LoggerMeta): LoggerMeta {
  if (!meta) return {};
  const out: LoggerMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = redactValue(key, value);
  }
  return out;
}

/**
 * JSON.stringify that never throws: circular references are replaced with
 * "[Circular]", and values that fail to serialize fall back to a String().
 * A logger must never take down the request that is being logged.
 */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    });
  } catch {
    try {
      return JSON.stringify(String(value));
    } catch {
      return '"[Unserializable]"';
    }
  }
}

function emit(level: LogLevel, message: string, meta?: LoggerMeta) {
  // Keep unit-test output clean.
  if (process.env.NODE_ENV === "test") return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...redact(meta),
  };
  const line = safeStringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: LoggerMeta) => emit("debug", message, meta),
  info: (message: string, meta?: LoggerMeta) => emit("info", message, meta),
  warn: (message: string, meta?: LoggerMeta) => emit("warn", message, meta),
  error: (message: string, meta?: LoggerMeta) => emit("error", message, meta),
};
