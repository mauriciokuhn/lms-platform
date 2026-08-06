"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { showSuccess, showError } from "@/components/ui/toast-utils";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string | null;
  published: boolean;
  approvalStatus?: string;
  rejectionReason?: string | null;
  featured?: boolean;
  instructor?: { id: string; name: string | null } | null;
  modulesCount: number;
  lessonsCount: number;
  studentsCount: number;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");
  const [approving, setApproving] = useState<string | null>(null);
  const [featuredToggling, setFeaturedToggling] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/courses?all=true");
        const data = await res.json();
        setCourses(data.map((c: Course) => ({
          ...c,
          approvalStatus: c.approvalStatus || (c.published ? "approved" : "draft"),
          featured: c.featured || false,
        })));
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleDeleteCourse(courseId: string) {
    if (!confirm("Excluir este curso permanentemente?")) return;
    setDeleting(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        showSuccess("Curso excluído com sucesso!");
      }
    } catch {} finally { setDeleting(null); }
  }

  async function handleToggleFeatured(courseId: string) {
    setFeaturedToggling(courseId);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/featured`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        showSuccess(data.course.featured ? "⭐ Curso em destaque!" : "Destaque removido");
        setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, featured: data.course.featured } : c));
      } else {
        const data = await res.json();
        showError(data.error || "Erro ao alternar destaque");
      }
    } catch { showError("Erro de conexão"); }
    finally { setFeaturedToggling(null); }
  }

  async function handleApprove(courseId: string) {
    setApproving(courseId);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (res.ok) {
        showSuccess("Curso aprovado!", "O instrutor foi notificado.");
        setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, approvalStatus: "approved", published: true } : c));
      } else {
        const data = await res.json();
        showError(data.error || "Erro ao aprovar");
      }
    } catch { showError("Erro de conexão"); }
    finally { setApproving(null); }
  }

  async function handleReject(courseId: string) {
    if (!rejectReason.trim()) return;
    setApproving(courseId);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: rejectReason }),
      });
      if (res.ok) {
        showSuccess("Curso rejeitado", "O instrutor foi notificado.");
        setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, approvalStatus: "rejected", rejectionReason: rejectReason } : c));
        setRejectModal(null);
        setRejectReason("");
      }
    } catch {} finally { setApproving(null); }
  }

  const pendingCourses = courses.filter((c) => c.approvalStatus === "pending");

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Cursos</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">Gerencie todos os cursos da plataforma</p>
        </div>
        <Link
          href="/admin/cursos/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Curso
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "all"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          Todos ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "pending"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          ⏳ Pendentes ({pendingCourses.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white" />
        </div>
      ) : activeTab === "pending" && pendingCourses.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center shadow-sm">
          <p className="text-lg mb-2">✅</p>
          <p className="text-zinc-500 dark:text-zinc-400">Nenhum curso aguardando aprovação</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Título</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">Instrutor</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Aulas</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">⭐</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(activeTab === "pending" ? pendingCourses : courses).map((course) => (
                <tr key={course.id} className={`transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  course.approvalStatus === "pending" ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                }`}>
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white">{course.title}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{course.category || "—"}</td>
                  <td className="px-6 py-4 text-sm text-zinc-500">{course.instructor?.name || "—"}</td>
                  <td className="px-6 py-4 text-center text-sm text-zinc-500">{course.lessonsCount}</td>
                  <td className="px-6 py-4 text-center">
                    {course.published ? (
                      <button
                        onClick={() => handleToggleFeatured(course.id)}
                        disabled={featuredToggling === course.id}
                        className={`transition-all ${
                          course.featured
                            ? "text-amber-500 hover:text-amber-400"
                            : "text-zinc-300 hover:text-zinc-400 dark:text-zinc-600 dark:hover:text-zinc-400"
                        } disabled:opacity-50`}
                        title={course.featured ? "Remover destaque" : "Destacar curso"}
                      >
                        {featuredToggling === course.id ? (
                          <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                        ) : (
                          <svg className="mx-auto h-5 w-5" fill={course.featured ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                      </button>
                    ) : (
                      <span className="text-zinc-200 dark:text-zinc-700">
                        <svg className="mx-auto h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      course.approvalStatus === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                      course.approvalStatus === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                      course.approvalStatus === "rejected" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                      "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {course.approvalStatus === "approved" ? "Publicado" :
                       course.approvalStatus === "pending" ? "Pendente" :
                       course.approvalStatus === "rejected" ? "Rejeitado" : "Rascunho"}
                    </span>
                    {course.approvalStatus === "rejected" && course.rejectionReason && (
                      <p className="mt-1 text-[10px] text-red-400">{course.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {course.approvalStatus === "pending" ? (
                        <>
                          <button
                            onClick={() => handleApprove(course.id)}
                            disabled={approving === course.id}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                          >
                            {approving === course.id ? "..." : "Aprovar"}
                          </button>
                          <button
                            onClick={() => setRejectModal(course.id)}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            Rejeitar
                          </button>
                        </>
                      ) : (
                        <Link
                          href={`/admin/cursos/${course.id}/editar`}
                          className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Editar
                        </Link>
                      )}
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        disabled={deleting === course.id}
                        className="rounded-lg px-3 py-1.5 text-sm text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50"
                      >
                        {deleting === course.id ? "..." : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Rejeitar Curso</h3>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Informe o motivo da rejeição. O instrutor será notificado.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Ex: O curso precisa de mais aulas práticas..."
              className="mt-4 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReject(rejectModal)}
                disabled={!rejectReason.trim() || approving === rejectModal}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {approving === rejectModal ? "..." : "Rejeitar Curso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
