"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getRoleHome } from "@/lib/role-home";
import { LocaleSwitcher } from "@/lib/i18n/locale-switcher";
import { useResumeCourse } from "@/lib/hooks/use-resume-course";
import { ResumeCourseButton } from "@/components/ui/resume-course-button";

interface Course {
  id: string;
  title: string;
  description: string;
  category: string | null;
  lessonsCount: number;
  studentsCount: number;
  modulesCount: number;
  featured?: boolean;
  averageRating?: number | null;
  totalReviews?: number;
}

const categoryIcons: Record<string, string> = {
  "Programação": "💻",
  "Front-end": "🎨",
  "Back-end": "⚙️",
  "Data Science": "📊",
  "Design": "🖌️",
  "Banco de Dados": "🗄️",
};

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState({ students: 0, courses: 0, lessons: 0 });
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  // In-progress courses for logged-in students ("Continue de onde parou")
  const [activeCourses, setActiveCourses] = useState<{
    id: string;
    title: string;
    category: string | null;
    progress: { percentage: number; completed: number; total: number };
  }[]>([]);
  const { resumeCourse, continueLoading } = useResumeCourse();
  const carouselRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const scrollCarousel = useCallback((direction: "left" | "right") => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollAmount = 200;
    el.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
  }, []);

  const checkScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  // Throttle scroll check with requestAnimationFrame
  const checkScrollThrottled = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(checkScroll);
  }, [checkScroll]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/courses");
        if (res.ok) {
          const data = await res.json();
          setCourses(data.slice(0, 6));
          // Calculate stats
          const totalStudents = data.reduce((acc: number, c: Course) => acc + c.studentsCount, 0);
          const totalLessons = data.reduce((acc: number, c: Course) => acc + c.lessonsCount, 0);
          setStats({
            students: totalStudents || 1247,
            courses: data.length || 6,
            lessons: totalLessons || 89,
          });
        }
      } catch {
        // Fallback stats
        setStats({ students: 1247, courses: 6, lessons: 89 });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load in-progress enrollments for logged-in students (home "Continue de onde parou")
  useEffect(() => {
    if (!session?.user) {
      setActiveCourses([]);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/enrollments");
        if (!res.ok) return;
        const data = await res.json();
        const active = (Array.isArray(data) ? data : [])
          .filter((e) => e?.status === "ACTIVE" && e?.progress?.percentage < 100)
          .map((e) => ({
            id: e.course.id,
            title: e.course.title,
            category: e.course.category || null,
            progress: e.progress,
          }))
          .slice(0, 3);
        setActiveCourses(active);
      } catch {
        // silent — section simply doesn't render
      }
    })();
  }, [session]);

  const testimonials = [
    { name: "Maria Silva", role: "Aluna", text: "Consegui aprender programação do zero e mudei de carreira! O certificado abriu portas incríveis.", avatar: "👩‍💻" },
    { name: "João Santos", role: "Aluno", text: "A plataforma é muito intuitiva. O sistema de progresso me manteve motivado até o final.", avatar: "👨‍🎓" },
    { name: "Ana Costa", role: "Aluna", text: "Os questionários com correção automática ajudaram muito a fixar o conteúdo. Recomendo demais!", avatar: "👩‍🏫" },
    { name: "Carlos Oliveira", role: "Aluno", text: "Melhor plataforma de cursos online que já usei. Player com controle de velocidade é essencial!", avatar: "🧑‍💻" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* ─── NAVBAR ─── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Ponto<span className="text-zinc-400"> do Saber</span>
          </span>
          <nav className="hidden items-center gap-6 sm:flex">
            <a href="#cursos" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">Cursos</a>
            <Link href="/categorias" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">Categorias</Link>
            <a href="#recursos" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">Recursos</a>
            <a href="#faq" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">FAQ</a>              <Link href="/instrutores" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">Instrutores</Link>
            <Link href="/planos" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">Planos</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LocaleSwitcher />
            {session?.user ? (
              <>
                <Link href={getRoleHome(session.user.role as string | undefined)} className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-lg dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  {session.user.role === "ADMIN" ? "Painel Admin" : session.user.role === "INSTRUCTOR" ? "Painel Instrutor" : "Dashboard"}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  Entrar
                </Link>
                <Link href="/register" className="rounded-xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-lg dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                  Cadastre-se
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden pt-24 sm:pt-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(0,0,0,0.03)_0%,transparent_100%)] dark:bg-[radial-gradient(45%_40%_at_50%_60%,rgba(255,255,255,0.03)_0%,transparent_100%)]" />
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-12 text-center sm:px-6 sm:pb-32 sm:pt-16">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Plataforma 100% gratuita
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl dark:text-white">
            Aprenda com os
            <span className="relative ml-3 inline-block">
              <span className="relative z-10 text-zinc-900 dark:text-white">melhores</span>
              <span className="absolute inset-x-0 bottom-1 h-3 bg-zinc-200 dark:bg-zinc-700 -z-0 rounded" />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            Plataforma completa de cursos online com videoaulas, questionários interativos,
            certificados digitais e acompanhamento inteligente de progresso.
          </p>

          {/* Stats Bar */}
          <div className="mx-auto mt-10 flex max-w-lg items-center justify-center gap-8 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {[
              { value: stats.students.toLocaleString(), label: "Alunos" },
              { value: stats.courses, label: "Cursos" },
              { value: stats.lessons, label: "Aulas" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register" className="rounded-xl bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-zinc-800 hover:shadow-xl dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              Começar Agora →
            </Link>
            <a href="#cursos" className="rounded-xl border border-zinc-300 px-8 py-3.5 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 hover:shadow-md dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Ver Cursos
            </a>
          </div>

          {/* Demo Login Button */}
          <div className="mx-auto mt-6 flex max-w-lg">
            <button
              onClick={async () => {
                setDemoLoading(true);
                const result = await signIn("credentials", {
                  email: "demo@lms.com",
                  password: "demo123",
                  redirect: false,
                });
                if (result?.ok) {
                  router.refresh();
                  router.push("/dashboard");
                } else {
                  setDemoLoading(false);
                }
              }}
              disabled={demoLoading}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/80 px-5 py-3.5 text-sm font-medium text-amber-800 transition-all hover:border-amber-400 hover:bg-amber-100 hover:shadow-lg dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:border-amber-600 dark:hover:bg-amber-950/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {demoLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                  Entrando no modo demonstração...
                </>
              ) : (
                <>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-base dark:bg-amber-800">🎯</span>
                  <span className="flex-1 text-left">
                    <strong>Experimentar sem Login</strong>
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">Modo demonstração — dados não são salvos</span>
                  </span>
                  <svg className="h-5 w-5 shrink-0 text-amber-500 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ─── CONTINUE LEARNING ─── */}
      {session?.user && activeCourses.length > 0 && (
        <section className="border-t border-zinc-100 px-4 py-12 dark:border-zinc-800">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Continue de onde parou</h2>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Retome seus cursos em andamento</p>
              </div>
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                Ir ao Dashboard
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeCourses.map((c) => (
                <Link
                  key={c.id}
                  href={`/cursos/${c.id}`}
                  className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                    <span className="text-3xl">{categoryIcons[c.category || ""] || "📚"}</span>
                  </div>
                  <h3 className="line-clamp-1 font-semibold text-zinc-900 dark:text-white">{c.title}</h3>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Progresso</span>
                      <span>{c.progress.percentage}%</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                        style={{ width: `${c.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                  <ResumeCourseButton
                    courseId={c.id}
                    loading={continueLoading === c.id}
                    onResume={resumeCourse}
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CATEGORY CAROUSEL ─── */}
      {!loading && courses.length > 0 && (() => {
        const catMap = new Map<string, { count: number; featured: number }>();
        const catGradients: Record<string, string> = {
          "Programação": "from-blue-500 to-indigo-600",
          "Front-end": "from-rose-500 to-pink-600",
          "Back-end": "from-emerald-500 to-teal-600",
          "Data Science": "from-violet-500 to-purple-600",
          "Design": "from-orange-500 to-red-500",
          "Banco de Dados": "from-cyan-500 to-sky-600",
        };
        for (const c of courses) {
          const cat = c.category || "Outros";
          if (!catMap.has(cat)) catMap.set(cat, { count: 0, featured: 0 });
          const entry = catMap.get(cat);
          if (!entry) continue;
          entry.count++;
          if (c.featured) entry.featured++;
        }
        const cats = Array.from(catMap.entries()).sort((a, b) => b[1].count - a[1].count);
        if (cats.length === 0) return null;
        return (
          <section className="border-t border-zinc-100 px-4 py-12 dark:border-zinc-800">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Explorar por Categoria</h2>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{cats.length} categorias disponíveis</p>
                </div>
                <Link href="/categorias" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  Ver todas
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              </div>
              <div className="relative group/carousel">
                {/* Left Arrow */}
                {canScrollLeft && (
                  <button
                    onClick={() => scrollCarousel("left")}
                    className="absolute -left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-lg transition-all hover:bg-zinc-100 hover:shadow-xl dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    aria-label="Rolar para esquerda"
                  >
                    <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                )}
                {/* Right Arrow */}
                {canScrollRight && (
                  <button
                    onClick={() => scrollCarousel("right")}
                    className="absolute -right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-lg transition-all hover:bg-zinc-100 hover:shadow-xl dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    aria-label="Rolar para direita"
                  >
                    <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
                <div
                  ref={carouselRef}
                  onScroll={checkScrollThrottled}
                  className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {cats.map(([name, data]) => {
                    const icon = categoryIcons[name] || "📚";
                    const gradient = catGradients[name] || "from-zinc-500 to-zinc-600";
                    const isPopular = data.count >= Math.max(...cats.map(([, d]) => d.count)) * 0.5;
                    return (
                      <Link
                        key={name}
                        href={`/cursos?cat=${encodeURIComponent(name)}`}
                        className="group flex-shrink-0 w-44 snap-start rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-xl shadow-sm transition-transform group-hover:scale-110`}>
                          {icon}
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300 transition-colors">
                          {name}
                        </h3>
                        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                          <span>{data.count} {data.count === 1 ? "curso" : "cursos"}</span>
                          {data.featured > 0 && <span className="text-amber-500">⭐</span>}
                        </div>
                        {isPopular && (
                          <div className="mt-2.5 h-1 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 dark:from-amber-600 dark:to-amber-400" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─── FEATURED COURSES ─── */}
      {!loading && courses.filter(c => c.featured).length > 0 && (
        <section className="border-t border-zinc-100 px-4 py-20 dark:border-zinc-800">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">⭐ Destaques</span>
              <h2 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">Cursos em Destaque</h2>
              <p className="mx-auto mt-3 max-w-2xl text-zinc-500 dark:text-zinc-400">
                Os cursos mais recomendados pelos nossos alunos e pela equipe.
              </p>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.filter(c => c.featured).slice(0, 6).map((course) => (
                <Link key={course.id} href={`/cursos/${course.id}`}
                  className="group relative rounded-2xl border-2 border-amber-200 bg-white p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl dark:border-amber-800 dark:bg-zinc-900 dark:hover:border-amber-600"
                >
                  {/* Badge */}
                  <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-sm shadow-lg">
                    ⭐
                  </div>
                  <div className="mb-4 flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                    <span className="text-4xl">{categoryIcons[course.category || ""] || "📚"}</span>
                  </div>
                  {course.category && (
                    <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      {course.category}
                    </span>
                  )}
                  <h3 className="mt-3 text-lg font-semibold text-zinc-900 group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-400 transition-colors">
                    {course.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{course.description}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {course.lessonsCount} aulas
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      {course.studentsCount} alunos
                    </span>
                    {course.averageRating && (
                      <span className="flex items-center gap-1 text-amber-500">
                        ⭐ {course.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── COURSES PREVIEW ─── */}
      <section id="cursos" className="border-t border-zinc-100 bg-zinc-50 px-4 py-20 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Catálogo</span>
            <h2 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">Nossos Cursos</h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-500 dark:text-zinc-400">
              Confira todos os cursos disponíveis na plataforma. Todos com acesso gratuito e certificado de conclusão.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.filter(c => !c.featured).slice(0, 6).map((course) => (
                <Link key={course.id} href={`/cursos/${course.id}`}
                  className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                >
                  <div className="mb-4 flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
                    <span className="text-4xl">{categoryIcons[course.category || ""] || "📚"}</span>
                  </div>
                  {course.category && (
                    <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {course.category}
                    </span>
                  )}
                  <h3 className="mt-3 text-lg font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300 transition-colors">
                    {course.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{course.description}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {course.lessonsCount} aulas
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      {course.studentsCount} alunos
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && <div className="mt-10 text-center">
            <Link href="/cursos" className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 hover:shadow-md dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Ver Todos os Cursos
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="recursos" className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Recursos</span>
            <h2 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">Tudo que você precisa em um só lugar</h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "🎬", title: "Player Inteligente", desc: "Player com seek bar, controle de velocidade (0.5x-2x) e salvamento automático do progresso." },
              { icon: "📝", title: "Questionários Automáticos", desc: "Avaliações com correção instantânea e nota mínima configurável para aprovação." },
              { icon: "🎓", title: "Certificado Digital", desc: "Certificado automático ao concluir o curso com 100% das aulas e nota mínima no quiz." },
              { icon: "📊", title: "Progresso Detalhado", desc: "Dashboard completo com métricas de progresso, aulas concluídas e desempenho geral." },
              { icon: "🏆", title: "Gamificação", desc: "Ganhe XP, badges e suba de nível enquanto estuda. Competição saudável com ranking." },
              { icon: "🤖", title: "Recomendações", desc: "Algoritmo inteligente que sugere cursos baseados no seu perfil e histórico." },
            ].map((feature) => (
              <div key={feature.title} className="group rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                <span className="text-3xl">{feature.icon}</span>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="border-t border-zinc-100 bg-zinc-50 px-4 py-20 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">O que nossos alunos dizem</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-lg dark:bg-zinc-800">{t.avatar}</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-zinc-400">{t.role}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">FAQ</span>
            <h2 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-white sm:text-4xl">Perguntas Frequentes</h2>
          </div>
          <div className="mt-10 space-y-3">
            {[
              { q: "Os cursos são realmente gratuitos?", a: "Sim! Todos os cursos da plataforma são 100% gratuitos. Você só precisa criar uma conta para começar." },
              { q: "Como recebo meu certificado?", a: "Ao concluir 100% das aulas e atingir a nota mínima (70%) no questionário final, o certificado é gerado automaticamente." },
              { q: "Posso acessar pelo celular?", a: "Sim! A plataforma é totalmente responsiva e funciona em qualquer dispositivo com acesso à internet." },
              { q: "Como é feito o acompanhamento do progresso?", a: "O sistema salva automaticamente seu progresso nos vídeos, marca aulas concluídas e mostra estatísticas detalhadas no dashboard." },
            ].map((faq, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                <button onClick={() => setActiveFaq(activeFaq === i ? null : i)} className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <span className="font-medium text-zinc-900 dark:text-white">{faq.q}</span>
                  <svg className={`h-5 w-5 text-zinc-400 transition-transform ${activeFaq === i ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {activeFaq === i && (
                  <div className="border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
                    <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="border-t border-zinc-100 bg-zinc-900 px-4 py-20 dark:border-zinc-800">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Pronto para começar sua jornada?</h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Junte-se a milhares de alunos e transforme seu futuro. Crie sua conta grátis em segundos.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/register" className="rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-zinc-900 shadow-lg transition-all hover:bg-zinc-100 hover:shadow-xl">
              Criar Conta Grátis
            </Link>
            <Link href="/cursos" className="rounded-xl border border-zinc-700 px-8 py-3.5 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-800">
              Explorar Cursos
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-zinc-200 bg-white px-4 py-12 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-lg font-bold text-zinc-900 dark:text-white">Ponto do Saber</span>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Plataforma de cursos online gratuita.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Plataforma</h3>
              <ul className="mt-3 space-y-2">
                <li><Link href="/cursos" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Cursos</Link></li>
                <li><Link href="/categorias" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Categorias</Link></li>
                <li><Link href="/planos" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Planos</Link></li>
                <li><Link href="/instrutores" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Instrutores</Link></li>
                <li><Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Entrar</Link></li>
                <li><Link href="/register" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Cadastre-se</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Recursos</h3>
              <ul className="mt-3 space-y-2">
                <li><span className="text-sm text-zinc-500 dark:text-zinc-400">Videoaulas</span></li>
                <li><Link href="/validar-certificado" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">Validar Certificado</Link></li>
                <li><span className="text-sm text-zinc-500 dark:text-zinc-400">Progresso</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Legal</h3>
              <ul className="mt-3 space-y-2">
                <li><span className="text-sm text-zinc-500 dark:text-zinc-400">Privacidade</span></li>
                <li><span className="text-sm text-zinc-500 dark:text-zinc-400">Termos de Uso</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-zinc-100 pt-6 text-center text-sm text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
            &copy; {new Date().getFullYear()} Ponto do Saber. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
