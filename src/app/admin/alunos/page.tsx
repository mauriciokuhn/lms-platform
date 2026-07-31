"use client";

import { useEffect, useState } from "react";

interface Student {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  coursesCount?: number;
  completedCount?: number;
  certificatesCount?: number;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

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
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {students.map((student) => (
                <tr key={student.id} className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
