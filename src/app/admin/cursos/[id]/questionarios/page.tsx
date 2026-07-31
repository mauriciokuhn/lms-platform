"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  maxAttempts: number;
  _count: {
    questions: number;
    attempts: number;
  };
}

export default function QuizzesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = use(params);
  const router = useRouter();
  const [courseTitle, setCourseTitle] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [quizPassing, setQuizPassing] = useState(70);
  const [quizAttempts, setQuizAttempts] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [courseRes, quizzesRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch(`/api/courses/${courseId}/quizzes`),
        ]);

        if (!courseRes.ok) {
          router.push("/admin/cursos");
          return;
        }

        const courseData = await courseRes.json();
        setCourseTitle(courseData.title);

        const quizzesData = await quizzesRes.json();
        setQuizzes(quizzesData);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [courseId, router]);

  async function handleCreateQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!quizTitle.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDesc || null,
          passingScore: quizPassing,
          maxAttempts: quizAttempts,
        }),
      });

      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuiz(quizId: string) {
    if (!confirm("Excluir este questionário? Todas as questões e tentativas serão removidas.")) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quizId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert("Erro ao excluir questionário");
      }
    } catch (err) {
      console.error("Error deleting quiz:", err);
      alert("Erro ao excluir questionário");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href={`/admin/cursos/${courseId}/editar`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para editar curso
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Questionários</h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">Gerencie os questionários do curso: {courseTitle}</p>
      </div>

      <div className="space-y-4">
        {quizzes.map((quiz) => (
          <div key={quiz.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">{quiz.title}</h3>
                {quiz.description && (
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{quiz.description}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
                  <span>{quiz._count.questions} questões</span>
                  <span>{quiz._count.attempts} tentativas</span>
                  <span>Nota mínima: {quiz.passingScore}%</span>
                  <span>Máx. tentativas: {quiz.maxAttempts}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/cursos/${courseId}/questionarios/${quiz.id}`}
                  className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Editar
                </Link>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}

        {quizzes.length === 0 && !showForm && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
            <p className="text-zinc-500 dark:text-zinc-400">Nenhum questionário criado ainda.</p>
          </div>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleCreateQuiz} className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Novo Questionário</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Título</label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Ex: Avaliação Final - Módulo 1"
                required
                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Descrição</label>
              <textarea
                value={quizDesc}
                onChange={(e) => setQuizDesc(e.target.value)}
                rows={2}
                placeholder="Opcional"
                className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nota Mínima (%)</label>
                <input
                  type="number"
                  value={quizPassing}
                  onChange={(e) => setQuizPassing(parseInt(e.target.value))}
                  min={0}
                  max={100}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Máx. Tentativas</label>
                <input
                  type="number"
                  value={quizAttempts}
                  onChange={(e) => setQuizAttempts(parseInt(e.target.value))}
                  min={1}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 dark:bg-white px-6 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
            >
              {saving ? "Criando..." : "Criar Questionário"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Questionário
        </button>
      )}
    </div>
  );
}
