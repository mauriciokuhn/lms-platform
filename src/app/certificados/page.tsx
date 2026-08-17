"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GamificationWidget } from "@/components/ui/gamification-display";
import { generateCertificatePdf } from "@/lib/certificate-pdf";

interface Certificate {
  id: string;
  certificateCode: string;
  course: {
    id: string;
    title: string;
    category: string | null;
  };
  issuedAt: string;
  issuedAtFormatted: string;
}

export default function CertificatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "loading") return;

    async function loadData() {
      try {
        const res = await fetch("/api/certificates");
        if (res.ok) {
          const data = await res.json();
          setCertificates(data);
        }
      } catch (err) {
        console.error("Error loading certificates:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session, router, status]);

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPdf() {
    if (!selectedCert) return;
    const studentName = session?.user?.name || session?.user?.email || "Aluno";
    try {
      await generateCertificatePdf({
        studentName,
        courseTitle: selectedCert.course.title,
        code: selectedCert.certificateCode,
        issuedAtFormatted: selectedCert.issuedAtFormatted,
        verificationUrl: `${window.location.origin}/certificados/${selectedCert.certificateCode}`,
      });
    } catch (err) {
      console.error("Error generating certificate PDF:", err);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-xl font-bold text-zinc-900 dark:text-white">
            Ponto do Saber
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/validar-certificado"
              className="hidden items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:flex"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Validar
            </Link>
            <GamificationWidget />
            {selectedCert && (
              <>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir / Salvar PDF
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 print:p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white" />
          </div>
        ) : certificates.length === 0 && !selectedCert ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center shadow-sm">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Nenhum certificado ainda</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Complete um curso e seja aprovado na avaliação final para receber seu certificado.
            </p>
            <Link
              href="/meus-cursos"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Ver Meus Cursos
            </Link>
          </div>
        ) : selectedCert ? null : (
          <>
            <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">Meus Certificados</h1>
            <p className="mb-8 text-zinc-500 dark:text-zinc-400">
              Seus certificados de conclusão de cursos
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition hover:shadow-md dark:hover:border-zinc-700"
                >
                  <div className="mb-4 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950">
                      <svg className="h-8 w-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-center text-lg font-semibold text-zinc-900 dark:text-white">
                    {cert.course.title}
                  </h3>
                  <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Concluído em {cert.issuedAtFormatted}
                  </p>
                  <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    Código: {cert.certificateCode}
                  </p>
                  <button
                    onClick={() => setSelectedCert(cert)}
                    className="mt-4 w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  >
                    Visualizar Certificado
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {selectedCert && (
          <div className="mx-auto max-w-4xl">
            <button
              onClick={() => setSelectedCert(null)}
              className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white print:hidden"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar para lista
            </button>

            <div className="relative overflow-hidden rounded-2xl border-8 border-amber-400 bg-white shadow-2xl print:border-4">
              <div className="absolute inset-0 m-4 rounded-xl border-2 border-amber-200" />

              <div className="relative px-12 py-16 text-center">
                <div className="mb-8 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600">
                    <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                </div>

                <h1 className="mb-2 text-4xl font-bold tracking-wide text-zinc-900">
                  CERTIFICADO
                </h1>
                <div className="mx-auto mb-6 h-1 w-24 rounded bg-gradient-to-r from-amber-300 to-amber-500" />

                <p className="text-lg text-zinc-600">Certificamos que</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">
                  {session?.user?.name || session?.user?.email}
                </p>
                <p className="mt-4 text-lg text-zinc-600">
                  concluiu com êxito o curso
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-600">
                  {selectedCert.course.title}
                </p>

                <div className="mx-auto mt-8 max-w-md border-t border-zinc-200 pt-6">
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    <div className="text-center">
                      <p className="font-semibold text-zinc-900">Data de Conclusão</p>
                      <p>{selectedCert.issuedAtFormatted}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-zinc-900">Código</p>
                      <p className="font-mono text-xs">{selectedCert.certificateCode}</p>
                    </div>
                  </div>
                </div>

                <div className="mx-auto mt-12 max-w-xs border-t border-zinc-300 pt-4">
                  <p className="text-sm font-semibold text-zinc-900">Ponto do Saber</p>
                  <p className="text-xs text-zinc-500">Certificado Digital</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
