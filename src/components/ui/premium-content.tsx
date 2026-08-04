"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

interface PremiumContentProps {
  children: React.ReactNode;
  /** Minimum plan required to view content. Default: "PRO" */
  requiredPlan?: "PRO" | "ENTERPRISE";
  /** Optional title for the upgrade prompt */
  title?: string;
  /** Optional description for the upgrade prompt */
  description?: string;
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * PremiumContent
 *
 * Blocks content from users below the required plan tier.
 * Shows an upgrade prompt with a link to /planos.
 *
 * Usage:
 *   <PremiumContent requiredPlan="PRO">
 *     <video src="..." />
 *   </PremiumContent>
 */
export function PremiumContent({
  children,
  requiredPlan = "PRO",
  title,
  description,
  className = "",
}: PremiumContentProps) {
  const { data: session } = useSession();
  const [showPrompt, setShowPrompt] = useState(true);

  const userPlan = (session?.user as any)?.plan || "FREE";
  const planHierarchy: Record<string, number> = {
    FREE: 0,
    PRO: 1,
    ENTERPRISE: 2,
  };

  const hasAccess = planHierarchy[userPlan] >= planHierarchy[requiredPlan];

  // User has access — show content normally
  if (hasAccess) {
    return <>{children}</>;
  }

  // Not logged in — show login prompt
  if (!session?.user) {
    return (
      <div className={`relative ${className}`}>
        {/* Blurred content preview */}
        <div className="pointer-events-none select-none blur-sm">
          {children}
        </div>
        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
          <div className="mx-4 max-w-sm rounded-2xl border border-zinc-200 bg-white/95 p-6 text-center shadow-xl dark:border-zinc-700 dark:bg-zinc-900/95">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
              <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 114.636 4.636a9 9 0 0112.728 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {title || "Faça login para acessar"}
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {description || "Faça login ou crie uma conta gratuita para continuar."}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cadastre-se
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Free user trying to access premium content — show upgrade prompt
  return (
    <div className={`relative ${className}`}>
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none blur-sm">
        {children}
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
        <div className={`mx-4 max-w-sm rounded-2xl border shadow-xl transition-all ${
          showPrompt
            ? "border-amber-200 bg-white/95 dark:border-amber-700 dark:bg-zinc-900/95"
            : "border-zinc-200 bg-white/95 dark:border-zinc-700 dark:bg-zinc-900/95"
        }`}>
          <div className="p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {title || "Conteúdo Premium"}
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {description || `Este conteúdo está disponível apenas para assinantes ${requiredPlan === "ENTERPRISE" ? "Enterprise" : "Pro"}.`}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="/planos"
                className="rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
              >
                Ver Planos
              </Link>
              <button
                onClick={() => setShowPrompt(false)}
                className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PremiumBadge — small badge to indicate premium content
 */
export function PremiumBadge({ plan = "PRO" }: { plan?: "PRO" | "ENTERPRISE" }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      {plan === "ENTERPRISE" ? "Enterprise" : "Pro"}
    </span>
  );
}

/**
 * usePlan — hook to check current user's plan
 */
export function usePlan() {
  const { data: session } = useSession();
  const userPlan = (session?.user as any)?.plan || "FREE";
  const planHierarchy: Record<string, number> = {
    FREE: 0,
    PRO: 1,
    ENTERPRISE: 2,
  };

  return {
    plan: userPlan as "FREE" | "PRO" | "ENTERPRISE",
    isPro: planHierarchy[userPlan] >= 1,
    isEnterprise: planHierarchy[userPlan] >= 2,
    hasAccess: (required: "PRO" | "ENTERPRISE") =>
      planHierarchy[userPlan] >= planHierarchy[required],
  };
}
