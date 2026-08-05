"use client";

import { useState } from "react";
import Link from "next/link";
import { showSuccess } from "@/components/ui/toast-utils";

interface VerifyResult {
  valid: boolean;
  certificate?: {
    code: string;
    studentName: string;
    courseTitle: string;
    courseCategory: string | null;
    issuedAt: string;
    issuedAtFormatted: string;
  };
  error?: string;
}

export default function ValidarCertificadoPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);
    setResult(null);
    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(trimmed)}`);
      const json = (await res.json()) as VerifyResult;
      setResult(json);
    } catch {
      setResult({ valid: false, error: "Erro ao verificar certificado" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950">
              <svg className="h-8 w-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Validar Certificado</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Digite o código do certificado para confirmar sua autenticidade em tempo real.
          </p>
        </div>

        {/* Search form */}
        <form
          onSubmit={handleVerify}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <label htmlFor="code" className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Código do certificado
          </label>
          <div className="flex gap-2">
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: CERT-ABC-123"
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-mono text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-amber-500 dark:focus:ring-amber-900"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Verificar
            </button>
          </div>
        </form>

        {/* Result */}
        {searched && result && !loading && (
          result.valid && result.certificate ? (
            <div className="mt-6 rounded-2xl border border-green-200 bg-white p-6 shadow-sm dark:border-green-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center gap-2 text-green-600 dark:text-green-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-semibold">Certificado Autêntico</span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Aluno</dt>
                  <dd className="mt-0.5 font-semibold text-zinc-900 dark:text-white">
                    {result.certificate.studentName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Curso</dt>
                  <dd className="mt-0.5 font-semibold text-zinc-900 dark:text-white">
                    {result.certificate.courseTitle}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Data de Conclusão</dt>
                  <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                    {result.certificate.issuedAtFormatted}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Código</dt>
                  <dd className="mt-0.5 font-mono text-sm text-zinc-700 dark:text-zinc-300">
                    {result.certificate.code}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/certificados/${result.certificate.code}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  Ver Certificado
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <button
                  onClick={() => {
                    const cert = result.certificate;
                    if (!cert) return;
                    navigator.clipboard.writeText(`${window.location.origin}/certificados/${cert.code}`);
                    showSuccess("Link copiado!");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Copiar Link
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-800 dark:bg-zinc-900">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
                <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Falha na verificação</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {result.error || "Nenhum certificado corresponde a este código. Verifique e tente novamente."}
              </p>
            </div>
          )
        )}

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para plataforma
          </Link>
        </div>
      </div>
    </div>
  );
}
