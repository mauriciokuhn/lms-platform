"use client";

import { useEffect } from "react";

/**
 * Global error boundary — catches errors thrown in the ROOT layout.
 * Next.js requires this file to render its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal error:", error);
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/nextjs")
        .then((Sentry) => Sentry.captureException(error))
        .catch(() => {});
    }
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="mx-auto max-w-md text-center">
            <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-900/40 to-orange-900/40" />
              <span className="relative text-6xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              Ocorreu um erro crítico
            </h1>
            <p className="mt-3 text-base leading-relaxed text-zinc-400">
              Encontramos um problema ao carregar a aplicação. Tente recarregar a
              página ou volte mais tarde.
            </p>
            {error.digest && (
              <p className="mt-4 text-xs text-zinc-500">
                Código do erro:{" "}
                <code className="font-mono text-zinc-400">{error.digest}</code>
              </p>
            )}
            <button
              onClick={reset}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition-all hover:bg-zinc-200 hover:shadow-xl"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Tentar Novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
