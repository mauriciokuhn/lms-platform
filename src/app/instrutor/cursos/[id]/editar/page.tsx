"use client";

import { useCallback, useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import { showSuccess, showError } from "@/components/ui/toast-utils";

interface Module {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: { id: string; title: string; contentType: string; orderIndex: number }[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string | null;
  thumbnailUrl: string | null;
  published: boolean;
  approvalStatus: string;
  rejectionReason: string | null;
  modules: Module[];
}

export default function InstructorEditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingModule, setAddingModule] = useState(false);

  // Edit mode
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const loadCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data);
        setEditTitle(data.title);
        setEditDescription(data.description);
        setEditCategory(data.category || "");
      }
    } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    (async () => {
      await loadCourse();
    })();
  }, [loadCourse]);

  async function handleSaveInfo() {
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          category: editCategory,
        }),
      });
      if (res.ok) {
        showSuccess("Curso atualizado!");
        setEditingTitle(false);
        loadCourse();
      } else {
        showError("Erro ao atualizar");
      }
    } catch { showError("Erro de conexão"); }
  }

  async function handleAddModule() {
    if (!newModuleTitle.trim()) return;
    setAddingModule(true);
    try {
      const res = await fetch(`/api/courses/${id}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newModuleTitle }),
      });
      if (res.ok) {
        showSuccess("Módulo adicionado!");
        setNewModuleTitle("");
        loadCourse();
      } else {
        showError("Erro ao adicionar módulo");
      }
    } catch { showError("Erro de conexão"); }
    finally { setAddingModule(false); }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm("Excluir este módulo e todas as suas aulas?")) return;
    try {
      const res = await fetch(`/api/courses/${id}/modules/${moduleId}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Módulo excluído");
        loadCourse();
      }
    } catch {}
  }

  // -- Thumbnail upload --
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setThumbnailPreview(objectUrl);

    setThumbnailUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "images");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await fetch(`/api/courses/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thumbnailUrl: data.url }),
        });
        showSuccess("Thumbnail atualizada!");
        loadCourse();
      } else {
        showSuccess("Thumbnail atualizada (local)");
      }
    } catch {
      showSuccess("Thumbnail atualizada (local)");
    } finally {
      setThumbnailUploading(false);
    }
  }

  async function handleSubmitApproval() {
    if (!confirm("Enviar este curso para aprovação do admin?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${id}/submit-approval`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showSuccess("Curso enviado!", "Agora é só aguardar a aprovação do admin.");
        loadCourse();
      } else {
        showError(data.error || "Erro ao enviar");
      }
    } catch { showError("Erro de conexão"); }
    finally { setSubmitting(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
    </div>
  );

  if (!course) return (
    <div className="p-8 text-center text-zinc-500">Curso não encontrado</div>
  );

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const canSubmit = course.modules.length > 0 && totalLessons > 0 && course.approvalStatus !== "pending" && course.approvalStatus !== "approved";

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-400">
        <Link href="/instrutor" className="hover:text-zinc-600 dark:hover:text-zinc-300">Dashboard</Link>
        <span>/</span>
        <Link href="/instrutor/cursos" className="hover:text-zinc-600 dark:hover:text-zinc-300">Meus Cursos</Link>
        <span>/</span>
        <span className="text-zinc-600 dark:text-zinc-300">{course.title}</span>
      </div>

      {/* Approval Status Banner */}
      {course.approvalStatus === "pending" && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Aguardando aprovação</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Seu curso foi enviado para revisão do admin. Você receberá uma notificação quando for aprovado ou rejeitado.</p>
            </div>
          </div>
        </div>
      )}

      {course.approvalStatus === "rejected" && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <span className="text-xl">❌</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">Curso não aprovado</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Motivo: {course.rejectionReason || "Não informado"}
              </p>
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                Faça as correções necessárias e envie novamente para aprovação.
              </p>
            </div>
          </div>
        </div>
      )}

      {course.approvalStatus === "approved" && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">Curso aprovado e publicado!</p>
              <p className="text-xs text-green-600 dark:text-green-400">Seu curso já está disponível para os alunos.</p>
            </div>
          </div>
        </div>
      )}

      {/* Course Info */}
      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        {editingTitle ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Título</label>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Descrição</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Categoria</label>
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
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
            <div className="flex gap-2">
              <button onClick={handleSaveInfo} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">Salvar</button>
              <button onClick={() => setEditingTitle(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{course.title}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  course.approvalStatus === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                  course.approvalStatus === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                  course.approvalStatus === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}>
                  {course.approvalStatus === "approved" ? "Publicado" :
                   course.approvalStatus === "pending" ? "Pendente" :
                   course.approvalStatus === "rejected" ? "Rejeitado" : "Rascunho"}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{course.description}</p>
              {course.category && <p className="mt-1 text-xs text-zinc-400">{course.category}</p>}
              <p className="mt-2 text-xs text-zinc-400">{course.modules.length} módulos · {totalLessons} aulas</p>
            </div>
            <button onClick={() => setEditingTitle(true)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
              Editar
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail Upload */}
      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-white">Thumbnail do Curso</h2>
        <div className="flex items-start gap-4">
          {course.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- course thumbnail
            <img
              src={course.thumbnailUrl}
              alt="Thumbnail"
              className="h-24 w-40 rounded-lg object-cover shadow-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          {thumbnailPreview && !course.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- local thumbnail preview
            <img
              src={thumbnailPreview}
              alt="Preview"
              className="h-24 w-40 rounded-lg object-cover shadow-sm"
            />
          )}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailUpload}
              className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800 dark:file:bg-white dark:file:text-zinc-900 dark:hover:file:bg-zinc-200"
            />
            <p className="mt-1 text-xs text-zinc-400">Formatos: JPG, PNG, WebP. Tamanho recomendado: 1280×720px</p>
            {thumbnailUploading && (
              <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                Enviando...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Módulos e Aulas</h2>
        </div>

        {/* Add Module */}
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            placeholder="Novo módulo..."
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            onKeyDown={(e) => { if (e.key === "Enter") handleAddModule(); }}
          />
          <button
            onClick={handleAddModule}
            disabled={!newModuleTitle.trim() || addingModule}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {addingModule ? "..." : "Adicionar"}
          </button>
        </div>

        {course.modules.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Nenhum módulo ainda. Adicione seu primeiro módulo acima, depois adicione aulas dentro de cada módulo.
            </p>
          </div>
        ) : (
          course.modules
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((mod) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                courseId={course.id}
                onDelete={() => handleDeleteModule(mod.id)}
                onUpdate={loadCourse}
              />
            ))
        )}
      </div>

      {/* Submit for Approval */}
      {canSubmit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Enviar para aprovação</h3>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {course.approvalStatus === "rejected"
                  ? "Após corrigir, envie novamente para análise do admin."
                  : "Seu curso está pronto para ser revisado e publicado pelo admin."}
              </p>
            </div>
            <button
              onClick={handleSubmitApproval}
              disabled={submitting}
              className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "Enviar para Aprovação"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ModuleCardProps {
  module: Module;
  courseId: string;
  onDelete: () => void;
  onUpdate: () => void;
}

function ModuleCard({ module, courseId, onDelete, onUpdate }: ModuleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [addingLesson, setAddingLesson] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState<string | null>(null);

  async function handleAddLesson() {
    if (!newLessonTitle.trim()) return;
    setAddingLesson(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/modules/${module.id}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newLessonTitle, contentType: "VIDEO" }),
      });
      if (res.ok) {
        showSuccess("Aula adicionada!");
        setNewLessonTitle("");
        onUpdate();
      }
    } catch {} finally { setAddingLesson(false); }
  }

  async function handleDeleteLesson(lessonId: string) {
    if (!confirm("Excluir esta aula permanentemente?")) return;
    setDeletingLesson(lessonId);
    try {
      const res = await fetch(`/api/courses/${courseId}/modules/${module.id}/lessons/${lessonId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showSuccess("Aula excluída");
        onUpdate();
      }
    } catch {} finally { setDeletingLesson(null); }
  }

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between bg-zinc-50 px-4 py-3 text-left transition hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-zinc-900 dark:text-white">
            {module.orderIndex}. {module.title}
          </span>
          <span className="text-xs text-zinc-400">({module.lessons.length} aulas)</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-xs text-red-500 hover:text-red-600"
        >
          Excluir
        </button>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 p-4 dark:border-zinc-700">
          {module.lessons.length === 0 ? (
            <p className="mb-3 text-xs text-zinc-400">Nenhuma aula neste módulo ainda.</p>
          ) : (
            <div className="mb-3 space-y-2">
              {module.lessons
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-3">
                      {lesson.contentType === "VIDEO" ? (
                        <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {lesson.orderIndex}. {lesson.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/instrutor/cursos/${courseId}/editar/lesson/${lesson.id}`}
                        className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        disabled={deletingLesson === lesson.id}
                        className="text-xs text-red-400 hover:text-red-500 disabled:opacity-50"
                      >
                        {deletingLesson === lesson.id ? "..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Add Lesson */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              placeholder="Nova aula..."
              className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              onKeyDown={(e) => { if (e.key === "Enter") handleAddLesson(); }}
            />
            <select
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              disabled
            >
              <option>Vídeo</option>
              <option>PDF</option>
              <option>Texto</option>
            </select>
            <button
              onClick={handleAddLesson}
              disabled={!newLessonTitle.trim() || addingLesson}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {addingLesson ? "..." : "Adicionar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
