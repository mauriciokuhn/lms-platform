"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitcher } from "@/lib/i18n/locale-switcher";

interface CategoryData {
  name: string;
  icon: string;
  gradient: string;
  coursesCount: number;
  lessonsCount: number;
  studentsCount: number;
  averageRating: number | null;
  featured: number;
}

const categoryMeta: Record<string, { icon: string; gradient: string; description: string }> = {
  "Programação": {
    icon: "💻",
    gradient: "from-blue-500 to-indigo-600",
    description: "JavaScript, TypeScript, algoritmos e lógica de programação",
  },
  "Front-end": {
    icon: "🎨",
    gradient: "from-rose-500 to-pink-600",
    description: "React, Next.js, HTML, CSS e interfaces modernas",
  },
  "Back-end": {
    icon: "⚙️",
    gradient: "from-emerald-500 to-teal-600",
    description: "Node.js, APIs REST, autenticação e servidores",
  },
  "Data Science": {
    icon: "📊",
    gradient: "from-violet-500 to-purple-600",
    description: "Python, Pandas, Machine Learning e análise de dados",
  },
  "Design": {
    icon: "🖌️",
    gradient: "from-orange-500 to-red-500",
    description: "UI/UX, Figma, Design Systems e cores",
  },
  "Banco de Dados": {
    icon: "🗄️",
    gradient: "from-cyan-500 to-sky-600",
    description: "SQL, PostgreSQL, modelagem e otimização",
  },
  "Ferramentas Digitais": {
    icon: "🧰",
    gradient: "from-amber-500 to-orange-600",
    description: "Google Drive, Docs, Classroom, Planilhas e lousa digital para professores",
  },
};

export default function CategoriasPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCourses, setTotalCourses] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/courses");
        if (res.ok) {
          const data = await res.json();
          setTotalCourses(data.length);

          const catMap = new Map<string, { coursesCount: number; lessonsCount: number; studentsCount: number; ratings: number[]; featured: number }>();

          for (const course of data) {
            const cat = course.category || "Outros";
            if (!catMap.has(cat)) {
              catMap.set(cat, { coursesCount: 0, lessonsCount: 0, studentsCount: 0, ratings: [], featured: 0 });
            }
            const entry = catMap.get(cat)!;
            entry.coursesCount++;
            entry.lessonsCount += course.lessonsCount || 0;
            entry.studentsCount += course.studentsCount || 0;
            if (course.averageRating) entry.ratings.push(course.averageRating);
            if (course.featured) entry.featured++;
          }

          const sorted = Array.from(catMap.entries())
            .map(([name, data]) => ({
              name,
              icon: categoryMeta[name]?.icon || "📚",
              gradient: categoryMeta[name]?.gradient || "from-zinc-500 to-zinc-600",
              coursesCount: data.coursesCount,
              lessonsCount: data.lessonsCount,
              studentsCount: data.studentsCount,
              averageRating: data.ratings.length > 0
                ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10
                : null,
              featured: data.featured,
            }))
            .sort((a, b) => b.coursesCount - a.coursesCount); // Most courses first

          setCategories(sorted);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const maxCourses = Math.max(...categories.map((c) => c.coursesCount), 1);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white">
            Ponto<span className="text-zinc-400"> do Saber</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/cursos" className="hidden sm:inline text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Cursos
            </Link>
            <Link href="/instrutores" className="hidden sm:inline text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Instrutores
            </Link>
            <ThemeToggle />
            <LocaleSwitcher />
            <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/register" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              Cadastre-se
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {totalCourses} cursos disponíveis
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
            Navegue por <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-600 to-zinc-400 dark:from-zinc-300 dark:to-zinc-500">Categorias</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-500 dark:text-zinc-400">
            Escolha uma área de conhecimento e descubra cursos que combinam com seus objetivos
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-16 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-5xl mb-4">📂</p>
            <p className="text-zinc-500 dark:text-zinc-400">Nenhuma categoria encontrada</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const isPopular = cat.coursesCount >= maxCourses * 0.5;
              const meta = categoryMeta[cat.name];

              return (
                <Link
                  key={cat.name}
                  href={`/cursos?cat=${encodeURIComponent(cat.name)}`}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isPopular
                      ? "border-zinc-200 bg-white shadow-md dark:border-zinc-700 dark:bg-zinc-900"
                      : "border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50"
                  }`}
                >
                  {/* Gradient header */}
                  <div className={`h-3 bg-gradient-to-r ${cat.gradient}`} />

                  <div className="p-6">
                    {/* Icon + Badge */}
                    <div className="flex items-start justify-between">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-2xl shadow-lg transition-transform group-hover:scale-110`}>
                        {cat.icon}
                      </div>
                      {cat.featured > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          ⭐ {cat.featured} em destaque
                        </span>
                      )}
                    </div>

                    {/* Name + Description */}
                    <h2 className="mt-5 text-xl font-bold text-zinc-900 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300 transition-colors">
                      {cat.icon} {cat.name}
                    </h2>
                    {meta?.description && (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {meta.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <div className="text-center">
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">{cat.coursesCount}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Cursos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">{cat.lessonsCount}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Aulas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">
                          {cat.averageRating ? (
                            <span className="text-amber-500">{cat.averageRating.toFixed(1)}</span>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">⭐ Média</p>
                      </div>
                    </div>

                    {/* Progress bar (relative popularity) */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${cat.gradient} transition-all duration-500`}
                          style={{ width: `${(cat.coursesCount / maxCourses) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400">
                        {cat.studentsCount} alunos
                      </span>
                    </div>

                    {/* Explore link */}
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-zinc-400 transition-all group-hover:text-zinc-900 dark:group-hover:text-white">
                      Explorar cursos
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        {!loading && categories.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href="/cursos"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 hover:shadow-md dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Ver todos os cursos
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
