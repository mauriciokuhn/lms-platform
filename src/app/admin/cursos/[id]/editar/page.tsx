"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showSuccess, showError } from "@/components/ui/toast-utils";

interface Instructor {
  id: string;
  name: string | null;
}

interface Lesson {
  id: string;
  title: string;
  contentType: string;
  contentUrl: string | null;
  contentBody: string | null;
  duration: number | null;
  orderIndex: number;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string | null;
  price: number | null;
  published: boolean;
  instructorId: string | null;
  modules: Module[];
}

export default function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [courseInstructorId, setCourseInstructorId] = useState("");
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [published, setPublished] = useState(false);

  // Module form
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingModule, setAddingModule] = useState(false);

  // Lesson form
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonContentType, setNewLessonContentType] = useState("VIDEO");
  const [newLessonContentUrl, setNewLessonContentUrl] = useState("");
  const [newLessonDuration, setNewLessonDuration] = useState("");

  // Thumbnail
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (!res.ok) {
          router.push("/admin/cursos");
          return;
        }
        const data = await res.json();
        setCourse(data);
        setTitle(data.title);
        setDescription(data.description);
        setCategory(data.category || "");
        setCourseInstructorId(data.instructorId || "");
        setPublished(data.published);
        
        // Load instructors for dropdown
        fetch("/api/instructors")
          .then((r) => r.json())
          .then((data) => setInstructors(data))
          .catch(() => {});
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [courseId, router]);

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          published,
          instructorId: courseInstructorId || undefined,
        }),
      });

      if (res.ok) {
        setMessage("Curso atualizado com sucesso!");
        showSuccess("Curso atualizado!", "As alterações foram salvas.");
      } else {
        const data = await res.json();
        showError(data.error || "Erro ao atualizar curso");
      }
    } catch (err) {
      console.error("Error:", err);
      showError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddModule() {
    if (!newModuleTitle.trim()) return;
    setAddingModule(true);

    try {
      const res = await fetch(`/api/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newModuleTitle }),
      });

      if (res.ok) {
        showSuccess("Módulo adicionado!");
        window.location.reload();
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setAddingModule(false);
    }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("Excluir este módulo e todas as suas aulas?")) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showSuccess("Módulo excluído!");
        window.location.reload();
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function handleAddLesson(moduleId: string) {
    if (!newLessonTitle.trim()) return;

    try {
      const res = await fetch(
        `/api/courses/${courseId}/modules/${moduleId}/lessons`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newLessonTitle,
            contentType: newLessonContentType,
            contentUrl: newLessonContentUrl || null,
            duration: newLessonDuration ? parseInt(newLessonDuration) : null,
          }),
        }
      );

      if (res.ok) {
        showSuccess("Aula adicionada!");
        window.location.reload();
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm("Excluir esta aula?")) return;

    try {
      const parentModule = course?.modules.find((m) =>
        m.lessons.some((l) => l.id === lessonId)
      );
      if (!parentModule) return;

      const res = await fetch(
        `/api/courses/${courseId}/modules/${parentModule.id}/lessons/${lessonId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        showSuccess("Aula excluída!");
        window.location.reload();
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setThumbnailPreview(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white" />
      </div>
    );
  }

  if (!course) {
    return <div className="p-8 text-zinc-500 dark:text-zinc-400">Curso não encontrado</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/admin/cursos"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para cursos
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Editar Curso</h1>
      </div>

      {message && (
        <div className={`mb-6 rounded-lg p-3 text-sm ${
          message.includes("sucesso") ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSaveCourse} className="mb-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Informações do Curso</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Instrutor</label>
            <select
              value={courseInstructorId}
              onChange={(e) => setCourseInstructorId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            >
              <option value="">Selecione...</option>
              {instructors.map((inst) => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
              />
              Publicado
            </label>
          </div>
        </div>
        {/* Thumbnail */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Thumbnail do Curso
          </label>
          <div className="mt-1 flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="block w-full text-sm text-zinc-500 dark:text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 dark:file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white dark:file:text-zinc-900 hover:file:bg-zinc-800 dark:hover:file:bg-zinc-200"
            />
            {thumbnailPreview && (
                // eslint-disable-next-line @next/next/no-img-element -- local thumbnail preview
                <img src={thumbnailPreview} alt="Preview" className="h-16 w-24 rounded-lg object-cover shadow-sm" />
            )}
          </div>
        </div>
        <div className="mt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-zinc-900 dark:bg-white px-6 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar Curso"}
          </button>
        </div>
      </form>

      {/* Modules */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Módulos e Aulas</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="Nome do novo módulo..."
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <button
              onClick={handleAddModule}
              disabled={addingModule}
              className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
            >
              {addingModule ? "..." : "+ Módulo"}
            </button>
          </div>
        </div>

        {course.modules.map((mod) => (
          <div key={mod.id} className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-6 py-3">
              <h3 className="font-semibold text-zinc-900 dark:text-white">
                <span className="text-zinc-400 dark:text-zinc-500">{mod.orderIndex}.</span> {mod.title}
              </h3>
              <button
                onClick={() => handleDeleteModule(mod.id)}
                className="text-sm text-red-500 dark:text-red-400 hover:text-red-700"
              >
                Excluir
              </button>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {mod.lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                      lesson.contentType === "VIDEO"
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        : lesson.contentType === "PDF"
                        ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                        : lesson.contentType === "TEXT"
                        ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}>
                      {lesson.contentType}
                    </span>
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{lesson.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lesson.duration && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {Math.floor(lesson.duration / 60)}min
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="text-xs text-red-500 dark:text-red-400 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-zinc-200 dark:border-zinc-700 px-6 py-3">
              {addingLessonTo === mod.id ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    placeholder="Título da aula..."
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                  <select
                    value={newLessonContentType}
                    onChange={(e) => setNewLessonContentType(e.target.value)}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-white"
                  >
                    <option value="VIDEO">Vídeo</option>
                    <option value="PDF">PDF</option>
                    <option value="TEXT">Texto</option>
                    <option value="LINK">Link</option>
                  </select>
                  <input
                    type="url"
                    value={newLessonContentUrl}
                    onChange={(e) => setNewLessonContentUrl(e.target.value)}
                    placeholder="URL do conteúdo..."
                    className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                  <input
                    type="number"
                    value={newLessonDuration}
                    onChange={(e) => setNewLessonDuration(e.target.value)}
                    placeholder="Duração (seg)"
                    className="w-24 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-white focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  />
                  <button
                    onClick={() => handleAddLesson(mod.id)}
                    className="rounded-lg bg-zinc-900 dark:bg-white px-3 py-1.5 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => setAddingLessonTo(null)}
                    className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingLessonTo(mod.id);
                    setNewLessonTitle("");
                    setNewLessonContentUrl("");
                    setNewLessonDuration("");
                  }}
                  className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar aula
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quiz Link */}
      <div className="mt-8">
        <Link
          href={`/admin/cursos/${courseId}/questionarios`}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Gerenciar Questionários
        </Link>
      </div>
    </div>
  );
}
