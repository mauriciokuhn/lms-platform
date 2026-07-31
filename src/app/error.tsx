"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console always
    console.error("Global Error:", error);

    // Send to Sentry in production
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Dynamic import to avoid blocking the UI
      import("@sentry/nextjs")
        .then((Sentry) => {
          Sentry.captureException(error);
        })
        .catch(() => {
          // Sentry not available
        });
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-zinc-950">
      <div className="mx-auto max-w-md text-center">
        {/* Error graphic */}
        <div className="relative mx-auto mb-8 flex h-48 w-48 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30" />
          <div className="relative">
            <span className="text-7xl">⚠️</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
          Algo deu errado
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          Ocorreu um erro inesperado ao carregar esta página. Nossa equipe já foi
          notificada e estamos trabalhando para resolver o problema.
        </p>

        {error.digest && (
          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-600">
            Código do erro: <code className="font-mono text-zinc-500 dark:text-zinc-500">{error.digest}</code>
          </p>
        )}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-zinc-800 hover:shadow-xl dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Tentar Novamente
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Voltar ao Início
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-10 border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/cursos", label: "Catálogo" },
              { href: "/login", label: "Entrar" },
              { href: "/register", label: "Cadastre-se" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
