"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getRoleHome } from "@/lib/role-home";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Anti-bot challenge (shown after repeated failed logins): the server
  // issues a one-time math question via GET /api/auth/challenge.
  const [challenge, setChallenge] = useState<{ token: string; question: string } | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState("");
  // 2FA: after the password is accepted, an emailed code must be confirmed.
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorMessage, setTwoFactorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function maybeLoadChallenge(emailValue: string) {
    if (!emailValue) return;
    try {
      const res = await fetch(`/api/auth/challenge?email=${encodeURIComponent(emailValue)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.required && data.token) {
        setChallenge({ token: data.token, question: data.question });
        setChallengeAnswer("");
      }
    } catch {
      // ignore — the challenge is a best-effort gate
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    let result;
    try {
      result = await signIn("credentials", {
        email,
        password,
        ...(challenge ? { challengeToken: challenge.token, challengeAnswer } : {}),
        redirect: false,
      });
    } catch {
      // The Auth.js client throws when the response isn't the standard shape
      // (e.g. the rate limiter's 429 body before the url fix, or a dropped
      // connection). Unstick the button and surface a generic message
      // instead of freezing on "Entrando..." forever.
      setError("Não foi possível entrar. Tente novamente.");
      setLoading(false);
      return;
    }

    // 2FA pending: the wrapper answered 202 and emailed a code.
    if (result?.status === 202 || (result?.url ?? "").includes("TwoFactorRequired")) {
      setTwoFactorRequired(true);
      setTwoFactorMessage("Código de verificação enviado para seu e-mail.");
      setLoading(false);
      return;
    }

    // Rate-limited (429): the wrapper returns { error } with X-RateLimit-*.
    if (result?.status === 429 || (result?.error ?? "").includes("Muitas requisições")) {
      setError("Muitas tentativas de login. Aguarde um minuto e tente novamente.");
      setLoading(false);
      return;
    }

    // Wrong (or missing) anti-bot challenge answer → issue a fresh one.
    if (result?.error === "ChallengeFailed") {
      setError("Resposta incorreta do desafio de segurança. Responda novamente.");
      await maybeLoadChallenge(email);
      setLoading(false);
      return;
    }

    if (result?.error) {
      setError("Email ou senha inválidos.");
      // After enough failures the next submit requires the challenge.
      await maybeLoadChallenge(email);
      setLoading(false);
      return;
    }

    // Send each user to their role home (admin → /admin, instructor → /instrutor)
    const session = await getSession();
    router.push(getRoleHome(session?.user?.role as string | undefined));
    router.refresh();
  }

  async function handleVerifyCode() {
    setLoading(true);
    setError("");
    setTwoFactorMessage("");
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code: twoFactorCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Código inválido.");
        setTwoFactorCode("");
        return;
      }
      const session = await getSession();
      router.push(getRoleHome(session?.user?.role as string | undefined));
      router.refresh();
    } catch {
      setError("Não foi possível verificar o código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    // A different account has its own failure history — drop the challenge.
    if (challenge) setChallenge(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 px-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Entrar
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="seu@email.com"
                required
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Senha
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/esqueci-senha"
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>

            {twoFactorRequired && (
              <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/40">
                <label
                  htmlFor="twoFactor"
                  className="block text-sm font-medium text-blue-800 dark:text-blue-300"
                >
                  Verificação em duas etapas
                </label>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                  {twoFactorMessage || "Digite o código enviado para seu e-mail."}
                </p>
                <input
                  id="twoFactor"
                  type="text"
                  maxLength={16}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.toUpperCase())}
                  placeholder="000000 ou XXXXX-XXXX"
                  required
                  autoFocus
                  className="mt-2 block w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-zinc-900"
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={loading || twoFactorCode.trim().length < 6}
                  className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Verificando..." : "Verificar código"}
                </button>
              </div>
            )}

            {challenge && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                <label
                  htmlFor="challenge"
                  className="block text-sm font-medium text-amber-800 dark:text-amber-300"
                >
                  Verificação de segurança
                </label>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  {challenge.question}
                </p>
                <input
                  id="challenge"
                  type="text"
                  inputMode="numeric"
                  value={challengeAnswer}
                  onChange={(e) => setChallengeAnswer(e.target.value)}
                  placeholder="Resposta"
                  required
                  autoFocus
                  className="mt-2 block w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:bg-zinc-900"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">ou</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          {/* Google Login */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar com Google
          </button>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-zinc-500">
            Não tem uma conta?{" "}
            <a
              href="/register"
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Cadastre-se
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
