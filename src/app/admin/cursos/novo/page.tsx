"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showSuccess } from "@/components/ui/toast-utils";

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [instructors, setInstructors] = useState<{ id: string; name: string | null }[]>([]);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/instructors")
      .then((r) => r.json())
      .then((data) => setInstructors(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category, published, instructorId: instructorId || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao criar curso");
        setLoading(false);
        return;
      }

      const course = await res.json();
      showSuccess("Curso criado!", "Agora você pode adicionar módulos e aulas.");
      router.push(`/admin/cursos/${course.id}/editar`);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, just show a preview using URL.createObjectURL
    const url = URL.createObjectURL(file);
    setThumbnailPreview(url);
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Novo Curso</h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Preencha as informações básicas do curso
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
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
          <label
            htmlFor="category"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
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
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Descreva o conteúdo do curso..."
            required
            className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        {/* Instructor selector */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Instrutor
          </label>
          <select
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm shadow-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="">Selecione um instrutor...</option>
            {instructors.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name || "Sem nome"}
              </option>
            ))}
          </select>
        </div>

        {/* Thumbnail Upload */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Thumbnail do Curso
          </label>
          <div className="mt-1 flex items-center gap-4">
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="block w-full text-sm text-zinc-500 dark:text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 dark:file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white dark:file:text-zinc-900 hover:file:bg-zinc-800 dark:hover:file:bg-zinc-200"
              />
            </div>
            {thumbnailPreview && (
              <div className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- local thumbnail preview */}
                <img
                  src={thumbnailPreview}
                  alt="Preview"
                  className="h-16 w-24 rounded-lg object-cover shadow-sm"
                />
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Formatos: JPG, PNG, WebP. Tamanho recomendado: 1280×720px
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="published"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="rounded border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <label htmlFor="published" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Publicar imediatamente
          </label>
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
