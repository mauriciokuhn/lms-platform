"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number;
  questions: Question[];
}

export default function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id: courseId, quizId } = use(params);
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);

  useEffect(() => {
    async function loadQuiz() {
      try {
        const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}`);
        if (!res.ok) {
          router.push(`/admin/cursos/${courseId}/questionarios`);
          return;
        }
        const data = await res.json();
        setQuiz(data);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [courseId, quizId, router]);

  async function handleAddQuestion() {
    if (!newQuestionText.trim() || newOptions.some((o) => !o.trim())) {
      setMessage("Preencha a pergunta e todas as opções");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newQuestionText,
          orderIndex: (quiz?.questions.length || 0) + 1,
          options: newOptions.map((opt, oi) => ({
            text: opt,
            isCorrect: oi === newCorrectIndex,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Questão adicionada com sucesso!");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage(`Erro: ${data.error || "Erro ao adicionar questão"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Remover esta questão?")) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage("Questão removida!");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const data = await res.json();
        setMessage(`Erro: ${data.error || "Erro ao remover questão"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white" />
      </div>
    );
  }

  if (!quiz) {
    return <div className="p-8 text-zinc-500 dark:text-zinc-400">Quiz não encontrado</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href={`/admin/cursos/${courseId}/questionarios`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{quiz.title}</h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">Gerencie as questões do questionário</p>
      </div>

      {message && (
        <div className={`mb-4 rounded-lg p-3 text-sm ${
          message.includes("sucesso")
            ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
            : "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
        }`}>
          {message}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span>Nota mínima: <strong className="text-zinc-900 dark:text-white">{quiz.passingScore}%</strong></span>
          <span>Máx. tentativas: <strong className="text-zinc-900 dark:text-white">{quiz.maxAttempts}</strong></span>
          <span>Questões: <strong className="text-zinc-900 dark:text-white">{quiz.questions.length}</strong></span>
        </div>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((question, qi) => (
          <div key={question.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <h3 className="flex-1 font-medium text-zinc-900 dark:text-white">
                <span className="text-zinc-400 dark:text-zinc-500">{qi + 1}.</span> {question.text}
              </h3>
              <button
                onClick={() => handleDeleteQuestion(question.id)}
                className="ml-4 text-sm text-red-500 dark:text-red-400 hover:text-red-700"
              >
                Remover
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {question.options.map((option, oi) => (
                <div
                  key={option.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    option.isCorrect
                      ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                      : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]">
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span>{option.text}</span>
                  {option.isCorrect && (
                    <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400">Correta</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Adicionar Questão</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Pergunta</label>
            <input
              type="text"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Digite a pergunta..."
              className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Opções</label>
            {newOptions.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctOption"
                  checked={newCorrectIndex === oi}
                  onChange={() => setNewCorrectIndex(oi)}
                  className="text-zinc-900 dark:text-white focus:ring-zinc-500"
                />
                <span className="w-6 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  {String.fromCharCode(65 + oi)}
                </span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...newOptions];
                    newOpts[oi] = e.target.value;
                    setNewOptions(newOpts);
                  }}
                  placeholder={`Opção ${String.fromCharCode(65 + oi)}`}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
                {oi === newCorrectIndex && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ Correta</span>
                )}
              </div>
            ))}
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Selecione o círculo ao lado da opção correta</p>
          </div>

          <button
            onClick={handleAddQuestion}
            disabled={saving}
            className="rounded-lg bg-zinc-900 dark:bg-white px-6 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? "Adicionando..." : "Adicionar Questão"}
          </button>
        </div>
      </div>
    </div>
  );
}
