"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitcher } from "@/lib/i18n/locale-switcher";
import { showSuccess, showError } from "@/components/ui/toast-utils";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  popular?: boolean;
  features: PlanFeature[];
  color: string;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Gratuito",
    price: 0,
    period: "/mês",
    description: "Perfeito para começar seus estudos",
    color: "zinc",
    features: [
      { text: "Acesso a todos os cursos gratuitos", included: true },
      { text: "Certificado digital de conclusão", included: true },
      { text: "Progresso automático das aulas", included: true },
      { text: "Questionários com correção automática", included: true },
      { text: "Gamificação (XP, badges, ranking)", included: true },
      { text: "Suporte por email", included: false },
      { text: "Cursos premium exclusivos", included: false },
      { text: "Download de materiais em PDF", included: false },
      { text: "Suporte prioritário 24/7", included: false },
      { text: "Certificado com verificação pública", included: true },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29.90,
    period: "/mês",
    description: "Para quem quer ir além",
    popular: true,
    color: "amber",
    features: [
      { text: "Tudo do plano Gratuito", included: true },
      { text: "Cursos premium exclusivos", included: true },
      { text: "Download de materiais em PDF", included: true },
      { text: "Suporte prioritário por email", included: true },
      { text: "Certificado com verificação pública", included: true },
      { text: "Badge exclusivo 'Pro' no perfil", included: true },
      { text: "Acesso antecipado a novos cursos", included: true },
      { text: "Suporte prioritário 24/7", included: false },
      { text: "Mentoria individual com instrutores", included: false },
      { text: "API para integração corporativa", included: false },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99.90,
    period: "/mês",
    description: "Para equipes e empresas",
    color: "zinc",
    features: [
      { text: "Tudo do plano Pro", included: true },
      { text: "Suporte prioritário 24/7", included: true },
      { text: "Mentoria individual com instrutores", included: true },
      { text: "API para integração corporativa", included: true },
      { text: "Dashboard administrativo dedicado", included: true },
      { text: "Relatórios avançados exportáveis", included: true },
      { text: "Até 50 usuários", included: true },
      { text: "SLA de 99.9% de disponibilidade", included: true },
      { text: "Treinamento personalizado para equipe", included: true },
      { text: "Contrato personalizado", included: true },
    ],
  },
];

export default function PlanosPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleSubscribe(plan: Plan) {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    if (plan.id === "free") {
      showSuccess("Você já está no plano Gratuito!");
      return;
    }

    setLoadingPlan(plan.id);

    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: `plan-${plan.id}`,
          courseTitle: `Plano ${plan.name} - LMS Platform`,
          coursePrice: annual ? plan.price * 10 : plan.price,
        }),
      });

      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.enrolled) {
        showSuccess("Matrícula realizada com sucesso!");
      } else {
        showError(data.error || "Erro ao processar pagamento");
      }
    } catch {
      showError("Erro de conexão. Tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            LMS<span className="text-zinc-400">Platform</span>
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            <Link href="/cursos" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
              Cursos
            </Link>
            <Link href="/planos" className="text-sm font-medium text-zinc-900 dark:text-white">
              Planos
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LocaleSwitcher />
            {session?.user ? (
              <Link href="/dashboard" className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400">
                  Entrar
                </Link>
                <Link href="/register" className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
                  Cadastre-se
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-28 pb-16">
        {/* Title */}
        <div className="text-center">
          <span className="inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Planos
          </span>
          <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">
            Escolha o plano ideal para você
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-500 dark:text-zinc-400">
            Comece grátis e evolua conforme suas necessidades. Cancele quando quiser.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-sm ${!annual ? "font-semibold text-zinc-900 dark:text-white" : "text-zinc-500"}`}>Mensal</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative h-6 w-11 rounded-full transition-colors ${annual ? "bg-zinc-900 dark:bg-white" : "bg-zinc-300 dark:bg-zinc-600"}`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform dark:bg-zinc-900 ${
                annual ? "translate-x-5" : ""
              }`}
            />
          </button>
          <span className={`text-sm ${annual ? "font-semibold text-zinc-900 dark:text-white" : "text-zinc-500"}`}>
            Anual
            <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
              Economize 2 meses
            </span>
          </span>
        </div>

        {/* Plans grid */}
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => {
            const monthlyPrice = annual ? Math.round(plan.price * 10 / 12) : plan.price;
            const isFree = plan.id === "free";

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-8 shadow-sm transition-all hover:shadow-lg ${
                  plan.popular
                    ? "border-amber-300 bg-white dark:border-amber-600 dark:bg-zinc-900 scale-105"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-block rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                      MAIS POPULAR
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{plan.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-zinc-900 dark:text-white">
                      {isFree ? "Grátis" : `R$ ${monthlyPrice.toFixed(2)}`}
                    </span>
                    {!isFree && (
                      <span className="ml-1 text-sm text-zinc-400">{annual ? "/mês (faturado anualmente)" : plan.period}</span>
                    )}
                  </div>
                  {annual && !isFree && (
                    <p className="mt-1 text-xs text-zinc-400">
                      R$ {(plan.price * 10).toFixed(2)}/ano
                    </p>
                  )}
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      {feature.included ? (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={feature.included ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-600"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loadingPlan === plan.id}
                  className={`mt-8 w-full rounded-xl py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    plan.popular
                      ? "bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-lg hover:shadow-xl"
                      : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processando...
                    </span>
                  ) : isFree ? (
                    "Começar Grátis"
                  ) : (
                    `Assinar ${plan.name}`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-center text-lg font-semibold text-zinc-900 dark:text-white">
            Perguntas Frequentes sobre Planos
          </h2>
          <div className="mt-6 space-y-3">
            {[
              { q: "Posso cancelar quando quiser?", a: "Sim! Você pode cancelar sua assinatura a qualquer momento. Seu acesso continua até o fim do período já pago." },
              { q: "O plano gratuito é realmente grátis?", a: "Sim! Todos os cursos gratuitos da plataforma permanecem 100% gratuitos. Você nunca será cobrado." },
              { q: "Como funciona a cobrança?", a: "A cobrança é feita via cartão de crédito através do Stripe, processador de pagamentos seguro e confiável." },
              { q: "Posso mudar de plano?", a: "Sim! Você pode fazer upgrade a qualquer momento. O valor é proporcionado ao período restante." },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white">
                  {faq.q}
                  <svg className="h-4 w-4 text-zinc-400 transition group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white px-4 py-8 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl text-center text-sm text-zinc-400">
          &copy; {new Date().getFullYear()} LMS Platform. Pagamentos processados pelo Stripe.
        </div>
      </footer>
    </div>
  );
}
