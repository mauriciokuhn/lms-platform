/**
 * Sentry Instrumentation
 *
 * Initializes Sentry for error tracking in production.
 * Falls back gracefully when SENTRY_DSN is not configured.
 *
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import { logger } from "@/lib/logger";

export async function register() {
  // Only initialize in production
  if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === "production") {
    try {
      const Sentry = await import("@sentry/nextjs");

      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1, // Sample 10% of transactions
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        integrations: [
          // Enable browser profiling (optional, adds ~20KB to bundle)
          // Sentry.browserProfilingIntegration(),
        ],
        // Ignore common 4xx errors that are not real bugs
        beforeSend(event) {
          if (
            event.exception?.values?.[0]?.value?.includes("404") ||
            event.exception?.values?.[0]?.value?.includes("NEXT_NOT_FOUND")
          ) {
            return null;
          }
          return event;
        },
      });

      logger.info("Sentry initialized");
    } catch (error) {
      logger.warn("Sentry initialization failed", { error: error instanceof Error ? error.message : String(error) });
    }
  }
}
