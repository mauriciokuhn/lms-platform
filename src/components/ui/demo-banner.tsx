"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function DemoBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  if (!session?.user?.isDemo || dismissed) return null;

  return (
    <div className="relative z-[60] bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-950">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="hidden sm:inline">🔍 Modo Demonstração —</span>
          <span>Você está explorando a plataforma. Os dados não são salvos.</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/register"
            className="whitespace-nowrap rounded-lg bg-amber-950 px-4 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-900"
          >
            Criar Conta Grátis 🚀
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-amber-950/60 hover:text-amber-950 hover:bg-amber-400/50 transition"
            aria-label="Fechar banner"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
