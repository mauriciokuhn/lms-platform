"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useResumeCourse } from "@/lib/hooks/use-resume-course";
import { ResumeCourseButton } from "@/components/ui/resume-course-button";
import { StarRating } from "@/components/ui/star-rating";
import { TopRatedBadge } from "@/components/ui/top-rated-badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitcher } from "@/lib/i18n/locale-switcher";
import { CourseCardSkeleton, CourseListSkeleton } from "@/components/ui/skeleton";

interface Instructor {
  id: string;
  name: string | null;
  headline: string | null;
  image: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string | null;
  price: number | null;
  instructor: Instructor | null;
  modulesCount: number;
  lessonsCount: number;
  studentsCount: number;
  averageRating: number | null;
  totalReviews: number;
}

type SortBy = "recent" | "rating" | "reviews" | "students";
type ViewMode = "grid" | "list";
type RatingFilter = "" | "3" | "4";
type PriceFilter = "" | "free" | "paid";

const VALID_SORT_VALUES: SortBy[] = ["recent", "rating", "reviews", "students"];

function isValidSortBy(value: string | null): value is SortBy {
  return VALID_SORT_VALUES.includes(value as SortBy);
}

const ITEMS_PER_PAGE = 10;

const categoryIcons: Record<string, string> = {
  "Programação": "💻",
  "Front-end": "🎨",
  "Back-end": "⚙️",
  "Data Science": "📊",
  "Design": "🖌️",
  "Banco de Dados": "🗄️",
};

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    }>
      <CoursesContent />
    </Suspense>
  );
}

function CoursesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  // courseId -> enrollment progress (only for logged-in students)
  const [enrollments, setEnrollments] = useState<Record<string, { percentage: number; completed: number; total: number }>>({});
  const { resumeCourse, continueLoading } = useResumeCourse();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("cat") || "");
  const [sortBy, setSortBy] = useState<SortBy>(
    (isValidSortBy(searchParams.get("sort")) ? searchParams.get("sort") : "recent") as SortBy
  );

  // New filters
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(searchParams.get("rating") as RatingFilter || "");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>(searchParams.get("price") as PriceFilter || "");
  const [viewMode, setViewMode] = useState<ViewMode>(searchParams.get("view") === "list" ? "list" : "grid");

  // Pagination
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Refs to avoid stale closures
  const searchRef = useRef(search);
  const catRef = useRef(categoryFilter);
  const sortRef = useRef(sortBy);
  const ratingRef = useRef(ratingFilter);
  const priceRef = useRef(priceFilter);
  const viewRef = useRef(viewMode);

  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { catRef.current = categoryFilter; }, [categoryFilter]);
  useEffect(() => { sortRef.current = sortBy; }, [sortBy]);
  useEffect(() => { ratingRef.current = ratingFilter; }, [ratingFilter]);
  useEffect(() => { priceRef.current = priceFilter; }, [priceFilter]);
  useEffect(() => { viewRef.current = viewMode; }, [viewMode]);

  const isFirstRender = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncUrl = useCallback(
    (newSearch: string, newCat: string, newSort: SortBy, newRating: RatingFilter, newPrice: PriceFilter, newView: ViewMode) => {
      const params = new URLSearchParams();
      if (newSearch) params.set("q", newSearch);
      if (newCat) params.set("cat", newCat);
      if (newSort !== "recent") params.set("sort", newSort);
      if (newRating) params.set("rating", newRating);
      if (newPrice) params.set("price", newPrice);
      if (newView !== "grid") params.set("view", newView);

      const query = params.toString();
      router.replace(query ? `/cursos?${query}` : "/cursos", { scroll: false });
    },
    [router]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      syncUrl(value, catRef.current, sortRef.current, ratingRef.current, priceRef.current, viewRef.current);
    }, 400);
  }, [syncUrl]);

  const handleCategoryChange = useCallback((value: string) => {
    setCategoryFilter(value);
    syncUrl(searchRef.current, value, sortRef.current, ratingRef.current, priceRef.current, viewRef.current);
  }, [syncUrl]);

  const handleSortChange = useCallback((value: SortBy) => {
    setSortBy(value);
    syncUrl(searchRef.current, catRef.current, value, ratingRef.current, priceRef.current, viewRef.current);
  }, [syncUrl]);

  const handleRatingChange = useCallback((value: RatingFilter) => {
    setRatingFilter(value);
    syncUrl(searchRef.current, catRef.current, sortRef.current, value, priceRef.current, viewRef.current);
  }, [syncUrl]);

  const handlePriceChange = useCallback((value: PriceFilter) => {
    setPriceFilter(value);
    syncUrl(searchRef.current, catRef.current, sortRef.current, ratingRef.current, value, viewRef.current);
  }, [syncUrl]);

  const handleViewChange = useCallback((value: ViewMode) => {
    setViewMode(value);
    syncUrl(searchRef.current, catRef.current, sortRef.current, ratingRef.current, priceRef.current, value);
  }, [syncUrl]);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("");
    setSortBy("recent");
    setRatingFilter("");
    setPriceFilter("");
    setViewMode("grid");
    router.replace("/cursos", { scroll: false });
  }, [router]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/courses");
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
      } catch (err) {
        console.error("Error loading courses:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Load the current user's enrollments (with progress) to badge their courses
  useEffect(() => {
    if (!session?.user) {
      setEnrollments({});
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/enrollments");
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, { percentage: number; completed: number; total: number }> = {};
        for (const e of Array.isArray(data) ? data : []) {
          if (e?.course?.id && e?.progress) {
            map[e.course.id] = {
              percentage: e.progress.percentage ?? 0,
              completed: e.progress.completed ?? 0,
              total: e.progress.total ?? 0,
            };
          }
        }
        setEnrollments(map);
      } catch (err) {
        console.error("Error loading enrollments:", err);
      }
    })();
  }, [session]);

  const minRating = ratingFilter ? parseInt(ratingFilter) : 0;

  const filteredCourses = courses
    .filter((course) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || course.title.toLowerCase().includes(q) || course.description.toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || course.category === categoryFilter;
      const matchesRating = !minRating || (course.averageRating ?? 0) >= minRating;
      const matchesPrice = !priceFilter || (priceFilter === "free" ? (course.price === 0 || course.price === null) : course.price && course.price > 0);
      return matchesSearch && matchesCategory && matchesRating && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "rating":
          const ra = a.averageRating || 0;
          const rb = b.averageRating || 0;
          if (rb !== ra) return rb - ra;
          return b.totalReviews - a.totalReviews;
        case "reviews":
          return b.totalReviews - a.totalReviews;
        case "students":
          return b.studentsCount - a.studentsCount;
        default:
          return 0;
      }
    });

  // Reset pagination when filters change (adjust state during render to avoid cascading effects)
  const filterKey = `${search}|${categoryFilter}|${sortBy}|${ratingFilter}|${priceFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(ITEMS_PER_PAGE);
  }

  // Smooth scroll to results when filters change
  useEffect(() => {
    mainRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [search, categoryFilter, sortBy, ratingFilter, priceFilter]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (visibleCount >= filteredCourses.length) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredCourses.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredCourses.length]);

  useEffect(() => {
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, []);

  // Respond to browser back/forward
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSearch(searchParams.get("q") || "");
    setCategoryFilter(searchParams.get("cat") || "");
    setSortBy((isValidSortBy(searchParams.get("sort")) ? searchParams.get("sort") : "recent") as SortBy);
    setRatingFilter(searchParams.get("rating") as RatingFilter || "");
    setPriceFilter(searchParams.get("price") as PriceFilter || "");
    setViewMode(searchParams.get("view") === "list" ? "list" : "grid");
  }, [searchParams]);

  const topRating = filteredCourses.reduce((max, c) => Math.max(max, c.averageRating || 0), 0);

  function isTopRated(course: Course): boolean {
    return course.totalReviews > 0 && course.averageRating !== null && course.averageRating === topRating;
  }

  const categories = [...new Set(courses.map((c) => c.category).filter((c): c is string => !!c))];
  const hasActiveFilters = !!(search || categoryFilter || ratingFilter || priceFilter || sortBy !== "recent");

  // ─── PAGE ENTRY ANIMATION ───
  function getCardAnimationStyle(index: number): Record<string, string> {
    const delay = (index % ITEMS_PER_PAGE) * 0.05;
    return {
      animation: `fadeInUp 0.45s ease-out ${delay}s both`,
    };
  }

  // Duration estimate from lessons count
  function getDurationLabel(count: number): string {
    if (count <= 5) return "Curto";
    if (count <= 15) return "Médio";
    return "Extenso";
  }

  function getDurationColor(count: number): string {
    if (count <= 5) return "text-green-500";
    if (count <= 15) return "text-amber-500";
    return "text-red-500";
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold text-zinc-900 dark:text-white">
            Ponto<span className="text-zinc-400"> do Saber</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/instrutores" className="hidden sm:inline text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Instrutores
            </Link>
            <ThemeToggle />
            <LocaleSwitcher />
            <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              Entrar
            </Link>
            <Link href="/register" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600">
              Cadastre-se
            </Link>
          </nav>
        </div>
      </header>

      <main ref={mainRef} className="mx-auto max-w-7xl px-4 py-8">
        {/* Title + Result Count */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Catálogo de Cursos</h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              {loading ? "Carregando..." : `Mostrando ${Math.min(visibleCount, filteredCourses.length)} de ${filteredCourses.length} cursos`}
            </p>
          </div>
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
            <button
              onClick={() => handleViewChange("grid")}
              className={`rounded-md p-2 transition ${viewMode === "grid" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
              title="Visualização em grade"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => handleViewChange("list")}
              className={`rounded-md p-2 transition ${viewMode === "list" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}
              title="Visualização em lista"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar cursos..."
                className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-4 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
              />
            </div>

            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todas categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Rating */}
            <select
              value={ratingFilter}
              onChange={(e) => handleRatingChange(e.target.value as RatingFilter)}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Qualquer avaliação</option>
              <option value="4">⭐⭐⭐⭐ 4+ estrelas</option>
              <option value="3">⭐⭐⭐ 3+ estrelas</option>
            </select>

            {/* Price */}
            <select
              value={priceFilter}
              onChange={(e) => handlePriceChange(e.target.value as PriceFilter)}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Qualquer preço</option>
              <option value="free">🎁 Gratuitos</option>
              <option value="paid">💰 Pagos</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortBy)}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <option value="recent">Mais recentes</option>
              <option value="rating">Melhor avaliados</option>
              <option value="reviews">Mais avaliados</option>
              <option value="students">Mais alunos</option>
            </select>
          </div>

          {/* Active filter tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-400">Filtros ativos:</span>
              {search && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Busca: &quot;{search}&quot;
                  <button onClick={() => { setSearch(""); syncUrl("", catRef.current, sortRef.current, ratingRef.current, priceRef.current, viewRef.current); }} className="ml-1 hover:text-zinc-900 dark:hover:text-white">×</button>
                </span>
              )}
              {categoryFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {categoryIcons[categoryFilter] || ""} {categoryFilter}
                  <button onClick={() => handleCategoryChange("")} className="ml-1 hover:text-zinc-900 dark:hover:text-white">×</button>
                </span>
              )}
              {ratingFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  ⭐ {ratingFilter}+ estrelas
                  <button onClick={() => handleRatingChange("")} className="ml-1 hover:text-zinc-900 dark:hover:text-white">×</button>
                </span>
              )}
              {priceFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {priceFilter === "free" ? "🎁 Gratuitos" : "💰 Pagos"}
                  <button onClick={() => handlePriceChange("")} className="ml-1 hover:text-zinc-900 dark:hover:text-white">×</button>
                </span>
              )}
              {sortBy !== "recent" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Ordenar: {sortBy === "rating" ? "melhor avaliados" : sortBy === "reviews" ? "mais avaliados" : "mais alunos"}
                  <button onClick={() => handleSortChange("recent")} className="ml-1 hover:text-zinc-900 dark:hover:text-white">×</button>
                </span>
              )}
              <button onClick={clearAllFilters} className="text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300">
                Limpar todos
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          viewMode === "list" ? (
            <div className="space-y-4">
              <CourseListSkeleton />
              <CourseListSkeleton />
              <CourseListSkeleton />
              <CourseListSkeleton />
              <CourseListSkeleton />
              <CourseListSkeleton />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </div>
          )
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-16 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Nenhum curso encontrado</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Tente ajustar os filtros ou buscar por outros termos</p>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="mt-4 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                Limpar filtros
              </button>
            )}
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-4">
            {filteredCourses.slice(0, visibleCount).map((course, idx) => {
              const enrollInfo = enrollments[course.id];
              return (
              <Link
                key={course.id}
                href={`/cursos/${course.id}`}
                style={getCardAnimationStyle(idx)}
                className="group relative flex gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
              >
                {isTopRated(course) && <TopRatedBadge />}
                <div className="flex h-24 w-36 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
                  <span className="text-3xl">{categoryIcons[course.category || ""] || "📚"}</span>
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {course.category && (
                          <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {course.category}
                          </span>
                        )}
                        <h3 className="mt-1 text-base font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300 transition-colors">
                          {course.title}
                        </h3>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-zinc-500 dark:text-zinc-400">{course.description}</p>
                  </div>
                  <div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
                      <span>{course.lessonsCount} aulas</span>
                      <span>{course.modulesCount} módulos</span>
                      <span className={getDurationColor(course.lessonsCount)}>{getDurationLabel(course.lessonsCount)}</span>
                      {course.averageRating && (
                        <span className="flex items-center gap-1 text-amber-500">
                          ⭐ {course.averageRating.toFixed(1)} ({course.totalReviews})
                        </span>
                      )}
                      <span>{course.studentsCount} alunos</span>
                      {course.instructor && (
                        <span className="text-zinc-400">por {course.instructor.name}</span>
                      )}
                    </div>
                    {enrollInfo && (
                      <div className="mt-3 flex items-center gap-3">
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                          ✅ Matriculado
                        </span>
                        <div
                          className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                          role="progressbar"
                          aria-valuenow={enrollInfo.percentage}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuetext={`${enrollInfo.percentage}%`}
                        >
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${enrollInfo.percentage}%` }} />
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {enrollInfo.completed}/{enrollInfo.total} aulas · {enrollInfo.percentage}%
                        </span>
                        <ResumeCourseButton
                          courseId={course.id}
                          loading={continueLoading === course.id}
                          onResume={resumeCourse}
                          variant="inline"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        ) : (
          /* ─── GRID VIEW ─── */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.slice(0, visibleCount).map((course, idx) => {
              // Hoisted so TS narrowing survives inside the onClick/onKeyDown
              // closures (and avoids repeating course.instructor access).
              const instructor = course.instructor;
              const enrollInfo = enrollments[course.id];
              return (
              <Link
                key={course.id}
                href={`/cursos/${course.id}`}
                style={getCardAnimationStyle(idx)}
                className="group relative rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900"
              >
                {isTopRated(course) && <TopRatedBadge />}

                <div className="mb-4 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700">
                  <span className="text-4xl">{categoryIcons[course.category || ""] || "📚"}</span>
                </div>
                {course.category && (
                  <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {course.category}
                  </span>
                )}
                <h3 className="mt-2 text-lg font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300 transition-colors">
                  {course.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{course.description}</p>
                {instructor && (
                  <p className="mt-2 text-xs text-zinc-400">
                    Por{" "}
                    {/* Nested <a> inside the card <a> is invalid HTML and
                        triggers a hydration error — navigate via router and
                        stop propagation instead of nesting anchors. */}
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/instrutores/${instructor.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/instrutores/${instructor.id}`);
                        }
                      }}
                      className="cursor-pointer font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    >
                      {instructor.name}
                    </span>
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
                  <span>{course.lessonsCount} aulas</span>
                  <span>{course.modulesCount} módulos</span>
                  <span className={getDurationColor(course.lessonsCount)}>{getDurationLabel(course.lessonsCount)}</span>
                </div>
                {enrollInfo && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-green-600 dark:text-green-400">✅ Matriculado</span>
                      <span className="text-zinc-500 dark:text-zinc-400">{enrollInfo.percentage}% concluído</span>
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                      role="progressbar"
                      aria-valuenow={enrollInfo.percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuetext={`${enrollInfo.percentage}%`}
                    >
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${enrollInfo.percentage}%` }} />
                    </div>
                    <ResumeCourseButton
                      courseId={course.id}
                      loading={continueLoading === course.id}
                      onResume={resumeCourse}
                      variant="full"
                    />
                  </div>
                )}
                {course.averageRating && (
                  <div className="mt-2">
                    <StarRating rating={course.averageRating} size="sm" showValue totalReviews={course.totalReviews} />
                  </div>
                )}
              </Link>
              );
            })}
          </div>
        )}

        {/* Pagination: Sentinel + Load More */}
        {!loading && filteredCourses.length > ITEMS_PER_PAGE && visibleCount < filteredCourses.length && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <button
              onClick={() => setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredCourses.length))}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-8 py-3 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md animate-fade-in dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              style={{ animation: 'fadeInUp 0.3s ease-out both' }}
            >
              Carregar mais ({Math.min(ITEMS_PER_PAGE, filteredCourses.length - visibleCount)} cursos)
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            <div ref={sentinelRef} className="h-4" />
          </div>
        )}
        {/* Final state: all loaded */}
        {!loading && filteredCourses.length > ITEMS_PER_PAGE && visibleCount >= filteredCourses.length && (
          <div className="mt-8 text-center" style={{ animation: 'fadeInUp 0.4s ease-out 0.1s both' }}>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              ✅ Todos os {filteredCourses.length} cursos foram carregados
            </p>
          </div>
        )}
      </main>

      {/* ─── GLOBAL ANIMATION STYLES ─── */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-delay: 0s !important;
          }
        }
      `}</style>
    </div>
  );
}
