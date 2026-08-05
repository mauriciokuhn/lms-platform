"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { showSuccess } from "@/components/ui/toast-utils";
import { generateCertificatePdf } from "@/lib/certificate-pdf";

interface CertificateData {
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

export default function PublicCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [data, setData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/certificates/verify/${code}`);
        const json = await res.json();
        setData(json);
      } catch {
        setData({ valid: false, error: "Erro ao verificar certificado" });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  if (!data?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
            <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Certificado Inválido</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {data?.error || "Não foi possível verificar este certificado."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-zinc-900 underline dark:text-white"
          >
            Voltar para plataforma
          </Link>
        </div>
      </div>
    );
  }

  const cert = data.certificate!;

  async function handleDownloadPdf() {
    try {
      await generateCertificatePdf({
        studentName: cert.studentName,
        courseTitle: cert.courseTitle,
        code: cert.code,
        issuedAtFormatted: cert.issuedAtFormatted,
        verificationUrl: window.location.href,
      });
    } catch (err) {
      console.error("Error generating certificate PDF:", err);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-2xl">
        {/* Verification Badge */}
        <div className="mb-4 flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Certificado Verificado
        </div>

        {/* Certificate Display */}
        <div className="relative overflow-hidden rounded-2xl border-8 border-amber-400 bg-white shadow-2xl">
          <div className="absolute inset-0 m-4 rounded-xl border-2 border-amber-200" />

          <div className="relative px-8 py-12 text-center sm:px-12 sm:py-16">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 sm:h-20 sm:w-20">
                <svg className="h-8 w-8 text-white sm:h-10 sm:w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>

            <h1 className="mb-2 text-3xl font-bold tracking-wide text-zinc-900 sm:text-4xl">
              CERTIFICADO
            </h1>
            <div className="mx-auto mb-6 h-1 w-24 rounded bg-gradient-to-r from-amber-300 to-amber-500" />

            <p className="text-base text-zinc-600 sm:text-lg">Certificamos que</p>
            <p className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">
              {cert.studentName}
            </p>
            <p className="mt-4 text-base text-zinc-600 sm:text-lg">
              concluiu com êxito o curso
            </p>
            <p className="mt-2 text-xl font-bold text-amber-600 sm:text-2xl">
              {cert.courseTitle}
            </p>

            <div className="mx-auto mt-8 max-w-md border-t border-zinc-200 pt-6">
              <div className="flex flex-col items-center justify-between gap-4 text-sm text-zinc-500 sm:flex-row">
                <div className="text-center">
                  <p className="font-semibold text-zinc-900">Data de Conclusão</p>
                  <p>{cert.issuedAtFormatted}</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-zinc-900">Código</p>
                  <p className="font-mono text-xs">{cert.code}</p>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-xs border-t border-zinc-300 pt-4">
              <p className="text-sm font-semibold text-zinc-900">LMS Platform</p>
              <p className="text-xs text-zinc-500">Certificado Digital Verificável</p>
            </div>
          </div>
        </div>

        {/* Share Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Baixar PDF
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / PDF
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              showSuccess("Link copiado!");
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copiar Link
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Plataforma
          </Link>
        </div>
      </div>
    </div>
  );
}
