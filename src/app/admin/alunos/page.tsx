"use client";

import { useEffect, useState, Fragment } from "react";

interface Student {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  coursesCount?: number;
  completedCount?: number;
  certificatesCount?: number;
}

interface SessionInfo {
  id: string;
  userAgent: string | null;
  createdAt: string;
  revoked: boolean;
  revocable: boolean;
}

function summarizeUserAgent(ua: string | null): string {
  if (!ua) return "Dispositivo desconhecido";
  const match = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|Edg\/|CriOS|FxiOS)\/([\d.]+)/);
  const os = ua.match(/(Windows|Mac OS X|Linux|Android|iPhone|iPad)/);
  const browser = match
    ? match[1].replace("Edg/", "Edge").replace("CriOS", "Chrome").replace("FxiOS", "Firefox")
    : "Navegador";
  return `${browser}${os ? ` · ${os[1].replace("Mac OS X", "macOS")}` : ""}`;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, SessionInfo[]>>({});
  const [sessionsLoading, setSessionsLoading] = useState<Record<string, boolean>>({});
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function toggleSessions(studentId: string) {
    if (openStudentId === studentId) {
      setOpenStudentId(null);
      return;
    }
    setOpenStudentId(studentId);
    if (sessions[studentId]) return;
    setSessionsLoading((s) => ({ ...s, [studentId]: true }));
    try {
      const res = await fetch(`/api/admin/students/${studentId}/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions((s) => ({ ...s, [studentId]: data.sessions || [] }));
      }
    } catch {
      // ignore — the table row just stays empty
    } finally {
      setSessionsLoading((s) => ({ ...s, [studentId]: false }));
    }
  }

  async function revokeSession(studentId: string, sessionId: string) {
    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/revoke`, { method: "POST" });
      if (res.ok) {
        setSessions((s) => ({
          ...s,
          [studentId]: (s[studentId] || []).map((sess) =>
            sess.id === sessionId ? { ...sess, revoked: true, revocable: false } : sess
          ),
        }));
      }
    } catch {
      // ignore
    } finally {
      setRevokingId(null);
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
          const res = await fetch("/api/admin/students");
          if (res.ok) {
            const data = await res.json();
            setStudents(data);
          }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Alunos</h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          Acompanhe o progresso dos alunos
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center shadow-sm">
          <p className="text-zinc-500 dark:text-zinc-400">Nenhum aluno cadastrado ainda</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Email
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Cursos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Concluídos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Certificados
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Cadastro
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Sessões
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {students.map((student) => (
                <Fragment key={student.id}>
                <tr className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-white">
                    {student.name || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    {student.coursesCount || "—"}
                  </td>
                <td className="px-6 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {student.completedCount ?? "—"}
                </td>
                <td className="px-6 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {student.certificatesCount ?? 0}
                </td>
                <td className="px-6 py-4 text-right text-sm text-zinc-400 dark:text-zinc-500">
                  {student.createdAt
                    ? new Date(student.createdAt).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => toggleSessions(student.id)}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {openStudentId === student.id ? "Ocultar" : "Ver"}
                  </button>
                </td>
              </tr>
              {openStudentId === student.id && (
                <tr>
                  <td colSpan={7} className="bg-zinc-50/50 px-6 py-4 dark:bg-zinc-800/30">
                    {sessionsLoading[student.id] ? (
                      <p className="text-sm text-zinc-400">Carregando sessões...</p>
                    ) : (sessions[student.id] || []).length === 0 ? (
                      <p className="text-sm text-zinc-400">Nenhuma sessão registrada.</p>
                    ) : (
                      <div className="space-y-2">
                        {(sessions[student.id] || []).map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                          >
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                {summarizeUserAgent(s.userAgent)}
                              </p>
                              <p className="text-xs text-zinc-400">
                                {new Date(s.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {s.revoked ? (
                                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                                  Encerrada
                                </span>
                              ) : (
                                <button
                                  onClick={() => revokeSession(student.id, s.id)}
                                  disabled={!s.revocable || revokingId === s.id}
                                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                                >
                                  {revokingId === s.id ? "Encerrando..." : "Encerrar"}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
