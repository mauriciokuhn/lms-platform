"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Instructor {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  headline: string | null;
  bio: string | null;
  coursesCount: number;
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/instructors");
        if (res.ok) {
          const data = await res.json();
          setInstructors(data);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white">
            LMS Platform
          </Link>
          <Link
            href="/cursos"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Ver Cursos
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">
            Nossos Instrutores
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-500 dark:text-zinc-400">
            Conheça os profissionais que criam e ministram nossos cursos.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          </div>
        ) : instructors.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-zinc-500 dark:text-zinc-400">Nenhum instrutor encontrado</p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {instructors.map((inst) => (
              <Link
                key={inst.id}
                href={`/instrutores/${inst.id}`}
                className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 text-2xl font-bold text-zinc-500 dark:from-zinc-700 dark:to-zinc-600 dark:text-zinc-300">
                    {inst.name?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300 transition-colors truncate">
                      {inst.name}
                    </h3>
                    {inst.headline && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {inst.headline}
                      </p>
                    )}
                  </div>
                </div>
                {inst.bio && (
                  <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {inst.bio}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {inst.coursesCount} {inst.coursesCount === 1 ? "curso" : "cursos"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
