"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { showSuccess, showError } from "@/components/ui/toast-utils";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  orderIndex: number;
  options: Option[];
}

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number;
  questions: Question[];
  courseId: string | null;
  _count?: { attempts?: number };
}

interface QuizResult {
  score: number;
  total: number;
  correct: number;
  passed: boolean;
  passingScore: number;
  results: {
    questionId: string;
    questionText: string;
    userAnswer: string | null;
    correctOptionId: string;
    correctOptionText: string;
    isCorrect: boolean;
    options: Option[];
  }[];
  certificate?: { code: string };
}

export default function QuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id: courseId, quizId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  // Attempts already used by the current user (from the quiz detail API).
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  useEffect(() => {
    async function loadQuiz() {
      try {
        const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}`);
        if (!res.ok) {
          router.push(`/cursos/${courseId}`);
          return;
        }
        const data = await res.json();
        setQuiz(data);
        setAttemptsUsed(data._count?.attempts ?? 0);
      } catch (err) {
        console.error("Error loading quiz:", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [courseId, quizId, router]);

  // Warn before leaving with answered questions (they would be lost).
  useEffect(() => {
    if (!answers || Object.keys(answers).length === 0 || result) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [answers, result]);

  function handleSelectOption(questionId: string, optionId: string) {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  async function handleSubmit() {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    const unanswered = quiz?.questions.filter((q) => !answers[q.id]);
    if (unanswered && unanswered.length > 0) {
      setError(`Responda todas as perguntas (faltam ${unanswered.length})`);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 403 = attempt limit reached (stale page / parallel tab) — sync
        // the counter so the UI disables the submit button.
        if (res.status === 403 && quiz) {
          setAttemptsUsed(quiz.maxAttempts);
        }
        setError(data.error || "Erro ao enviar respostas");
        return;
      }

      setResult(data);
      // This attempt just counted — keep the UI in sync without a reload.
      setAttemptsUsed((prev) => prev + 1);

      if (data.passed) {
        showSuccess("Parabéns!", `Você acertou ${data.correct} de ${data.total} questões e foi aprovado!`);
      } else {
        showError("Não foi dessa vez", `Você acertou ${data.correct} de ${data.total} questões. Continue estudando!`);
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700" />
            <div className="absolute inset-0 flex items-center justify-center text-lg">📝</div>
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Quiz não encontrado</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">O quiz pode ter sido removido ou o link está incorreto.</p>
          <Link href={`/cursos/${courseId}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Voltar ao curso
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <Link
              href={`/cursos/${courseId}`}
              className="mb-1 inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar para o curso
            </Link>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{quiz.title}</h1>
          </div>
          {!result && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {Object.keys(answers).length}/{quiz.questions.length} respondidas
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!result && quiz.description && (
          <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{quiz.description}</p>
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              Nota mínima: {quiz.passingScore}% | Tentativas usadas: {attemptsUsed} de {quiz.maxAttempts}
            </p>
          </div>
        )}

        {/* Attempts exhausted — the server would reject any further submit. */}
        {!result && session?.user && quiz.maxAttempts > 0 && attemptsUsed >= quiz.maxAttempts && (
          <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-700 dark:text-amber-300">
            Você já usou todas as {quiz.maxAttempts} tentativas deste questionário.
          </div>
        )}

        {/* Result Banner */}
        {result && (
          <div className={`mb-6 rounded-xl border p-6 shadow-sm ${
            result.passed
              ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
              : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950"
          }`}>
            <div className="text-center">
              <div className={`text-5xl font-bold ${result.passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {result.score}%
              </div>
              <p className={`mt-2 text-lg font-semibold ${result.passed ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                {result.passed ? "✅ Aprovado!" : "❌ Não foi dessa vez"}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {result.correct} de {result.total} questões corretas
                {!result.passed && ` (mínimo: ${result.passingScore}%)`}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Tentativas usadas: {attemptsUsed} de {quiz.maxAttempts}
              </p>
              {!result.passed && attemptsUsed < quiz.maxAttempts && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Revise o gabarito nas respostas abaixo e tente novamente.
                </p>
              )}
              {result.passed && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <Link
                    href={`/cursos/${courseId}`}
                    className="rounded-lg bg-zinc-900 dark:bg-white px-6 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  >
                    Voltar ao Curso
                  </Link>
                  {result.certificate ? (
                    <Link
                      href={`/certificados/${result.certificate.code}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      🎓 Ver Certificado
                    </Link>
                  ) : (
                    <Link
                      href="/certificados"
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-6 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      Ver Certificados
                    </Link>
                  )}
                </div>
              )}
              {!result.passed && attemptsUsed >= quiz.maxAttempts && (
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Você usou todas as {quiz.maxAttempts} tentativas deste questionário.
                </p>
              )}
              {!result.passed && attemptsUsed < quiz.maxAttempts && (
                <button
                  onClick={() => { setResult(null); setAnswers({}); }}
                  className="mt-4 rounded-lg bg-zinc-900 dark:bg-white px-6 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  Tentar Novamente (restam {quiz.maxAttempts - attemptsUsed})
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {quiz.questions.map((question, index) => {
            const questionResult = result?.results.find(
              (r) => r.questionId === question.id
            );

            return (
              <div
                key={question.id}
                className={`rounded-xl border bg-white dark:bg-zinc-900 p-6 shadow-sm ${
                  questionResult
                    ? questionResult.isCorrect
                      ? "border-green-200 dark:border-green-800"
                      : "border-red-200 dark:border-red-800"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <h3 className="mb-4 text-sm font-medium text-zinc-900 dark:text-white">
                  <span className="text-zinc-400 dark:text-zinc-500">Pergunta {index + 1}:</span>{" "}
                  {question.text}
                </h3>
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const isSelected = answers[question.id] === option.id;
                    const isCorrectOption = questionResult?.correctOptionId === option.id;
                    const isWrongSelection = isSelected && questionResult && !option.isCorrect;

                    let optionStyle = "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800";
                    if (isSelected && !questionResult) optionStyle = "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800";
                    if (questionResult && isCorrectOption) optionStyle = "border-green-500 bg-green-50 dark:bg-green-950";
                    if (isWrongSelection) optionStyle = "border-red-500 bg-red-50 dark:bg-red-950";

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSelectOption(question.id, option.id)}
                        disabled={!!questionResult}
                        className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition disabled:cursor-default ${optionStyle}`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                          isSelected && !questionResult
                            ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                            : questionResult && isCorrectOption
                            ? "border-green-500 bg-green-500 text-white"
                            : isWrongSelection
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}>
                          {isSelected || (questionResult && (isCorrectOption || isWrongSelection)) ? (
                            isCorrectOption || (isSelected && !questionResult) ? (
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )
                          ) : (
                            String.fromCharCode(65 + question.options.indexOf(option))
                          )}
                        </span>
                        <span className={`flex-1 ${
                          questionResult && isCorrectOption ? "font-medium text-green-800 dark:text-green-300" : "text-zinc-700 dark:text-zinc-300"
                        }`}>
                          {option.text}
                        </span>
                        {questionResult && isCorrectOption && (
                          <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!result && session?.user && (quiz.maxAttempts === 0 || attemptsUsed < quiz.maxAttempts) && (
          <div className="mt-8 text-center">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-8 py-3 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Corrigindo..." : "Enviar Respostas"}
            </button>
          </div>
        )}

        {!result && !session?.user && (
          <div className="mt-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center shadow-sm">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Entre para responder o questionário e salvar seu resultado.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-8 py-3 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              Entrar
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
