"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showSuccess, showError } from "@/components/ui/toast-utils";

export default function InstructorNewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/instructor/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar curso");
        setLoading(false);
        return;
      }

      const course = await res.json();
      showSuccess("Curso criado!", "Agora adicione módulos e aulas antes de enviar para aprovação.");
      router.push(`/instrutor/cursos/${course.id}/editar`);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
          <Link href="/instrutor" className="hover:text-zinc-600 dark:hover:text-zinc-300">Dashboard</Link>
          <span>/</span>
          <Link href="/instrutor/cursos" className="hover:text-zinc-600 dark:hover:text-zinc-300">Meus Cursos</Link>
          <span>/</span>
          <span className="text-zinc-600 dark:text-zinc-300">Novo</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Novo Curso</h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Crie seu curso. Após adicionar conteúdo, envie para aprovação do admin.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 dark:border-amber-800 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <span className="text-lg">📋</span>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Fluxo de criação</p>
            <ol className="mt-1 text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
              <li>Crie o curso com título e descrição</li>
              <li>Adicione módulos e aulas</li>
              <li>Envie para aprovação do admin</li>
              <li>Após aprovado, o curso será publicado automaticamente</li>
            </ol>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Título do Curso
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Introdução ao JavaScript"
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Categoria
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm shadow-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="">Selecione...</option>
            <option value="Programação">Programação</option>
            <option value="Front-end">Front-end</option>
            <option value="Back-end">Back-end</option>
            <option value="Data Science">Data Science</option>
            <option value="Design">Design</option>
            <option value="Banco de Dados">Banco de Dados</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Descreva o conteúdo do curso, o que os alunos vão aprender..."
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 dark:bg-white px-6 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar Curso"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
