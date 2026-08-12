"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { showSuccess } from "@/components/ui/toast-utils";
import { PlayerWrapper } from "@/components/ui/player-wrapper";
import { useCelebration, CelebrationModal } from "@/components/ui/celebration";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  contentUrl: string | null;
  contentBody: string | null;
  duration: number | null;
  orderIndex: number;
  moduleId: string;
  progress?: { userId: string; completed: boolean }[];
}

interface Module {
  id: string;
  title: string;
  orderIndex: number;
  lessons: Lesson[];
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  modules: Module[];
}

/**
 * Renderiza o corpo da aula com suporte a subtítulos.
 * Blocos iniciados com "## " viram subtítulos em destaque;
 * os demais blocos viram parágrafos.
 */
function LessonBody({ body }: { body: string | null }) {
  if (!body) return null;
  const blocks = body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <div className="space-y-4">
      {blocks.map((block, i) =>
        block.startsWith("## ") ? (
          <h3 key={i} className="pt-4 text-lg font-semibold text-amber-300">
            {block.slice(3)}
          </h3>
        ) : (
          <p key={i} className="text-zinc-300 leading-relaxed">
            {block}
          </p>
        )
      )}
    </div>
  );
}

export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<{ completed: boolean; watchedSeconds: number }>({ completed: false, watchedSeconds: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { celebration, celebrate, closeCelebration } = useCelebration();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  // Modules collapsed in the sidebar (retrair/expandir). Null until course loads.
  const [collapsedModules, setCollapsedModules] = useState<Set<string> | null>(null);
  // IDs of lessons already completed by the current user (sidebar checkmarks).
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());

  // Find current lesson and adjacent lessons
  const allLessons = course?.modules.flatMap((m) => m.lessons) || [];
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const loadData = useCallback(async () => {
    try {
      const [courseRes, progressRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch(`/api/lessons/${lessonId}/progress`),
      ]);

      if (!courseRes.ok) {
        router.push("/cursos");
        return;
      }

      const courseData = await courseRes.json();
      const progressData = await progressRes.json();

      setCourse(courseData);

      // Build the set of completed lesson IDs for the current user
      const userId = session?.user?.id;
      if (userId) {
        const completed = new Set<string>();
        for (const mod of courseData.modules) {
          for (const lesson of mod.lessons) {
            if (
              Array.isArray(lesson.progress) &&
              lesson.progress.some((p: { userId: string; completed: boolean }) => p.userId === userId && p.completed)
            ) {
              completed.add(lesson.id);
            }
          }
        }
        setCompletedLessonIds(completed);
      } else {
        setCompletedLessonIds(new Set());
      }

      // Find current lesson across all modules
      let found: Lesson | null = null;
      for (const mod of courseData.modules) {
        const l = mod.lessons.find((lesson: Lesson) => lesson.id === lessonId);
        if (l) {
          found = l;
          break;
        }
      }
      setCurrentLesson(found);
      setProgress(progressData);
    } catch (err) {
      console.error("Error loading lesson:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, router, session]);

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, [loadData]);

  // Initialize collapsed state: restore from localStorage when present,
  // otherwise collapse every module except the current lesson's module.
  useEffect(() => {
    if (collapsedModules !== null || !course) return;
    const storageKey = `pds-collapsed-modules-${course.id}`;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCollapsedModules(new Set(parsed));
          return;
        }
      }
    } catch {
      // corrupted/blocked storage — fall through to defaults
    }
    const currentModuleId = course.modules.find((m) =>
      m.lessons.some((l) => l.id === lessonId)
    )?.id;
    const collapsed = new Set<string>();
    for (const mod of course.modules) {
      if (mod.id !== currentModuleId) collapsed.add(mod.id);
    }
    setCollapsedModules(collapsed);
  }, [collapsedModules, course, lessonId]);

  // Persist the collapsed state after every change (incl. first init).
  useEffect(() => {
    if (collapsedModules === null || !course) return;
    try {
      window.localStorage.setItem(
        `pds-collapsed-modules-${course.id}`,
        JSON.stringify([...collapsedModules])
      );
    } catch {
      // storage unavailable (e.g. private mode) — ignore
    }
  }, [collapsedModules, course]);

  // Restore the scroll position where the student stopped in this lesson.
  useEffect(() => {
    if (loading) return;
    const key = `pds-lesson-scroll-${lessonId}`;
    try {
      const saved = parseInt(window.localStorage.getItem(key) || "0", 10);
      if (saved > 0) {
        // Small delay so the content (and video iframe) settles first.
        const timer = setTimeout(() => window.scrollTo({ top: saved }), 100);
        return () => clearTimeout(timer);
      }
    } catch {
      // corrupted/blocked storage — ignore
    }
  }, [loading, lessonId]);

  // Save the scroll position (debounced) while reading and on leave.
  useEffect(() => {
    if (loading) return;
    const key = `pds-lesson-scroll-${lessonId}`;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          window.localStorage.setItem(key, String(window.scrollY));
        } catch {
          // ignore
        }
      }, 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      try {
        if (window.scrollY > 0) {
          window.localStorage.setItem(key, String(window.scrollY));
        }
      } catch {
        // ignore
      }
    };
  }, [loading, lessonId]);

  // Remember this lesson as the student's last visited one for this course
  // (used by the catalog "Continuar curso" shortcut to resume where they left off).
  useEffect(() => {
    if (loading || !lessonId) return;
    try {
      window.localStorage.setItem(`pds-last-lesson-${courseId}`, lessonId);
    } catch {
      // ignore
    }
  }, [loading, courseId, lessonId]);

  const toggleModule = (moduleId: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev || []);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  // Track progress every 30 seconds while watching
  useEffect(() => {
    if (!currentLesson || !session?.user || progress.completed) return;

    const interval = setInterval(async () => {
      try {
        await fetch(`/api/lessons/${lessonId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            watchedSeconds: (progress.watchedSeconds || 0) + 30,
          }),
        });
        setProgress((prev) => ({
          ...prev,
          watchedSeconds: (prev.watchedSeconds || 0) + 30,
        }));
      } catch (err) {
        console.error("Error saving progress:", err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentLesson, session, lessonId, progress.completed, progress.watchedSeconds]);

  async function handleMarkComplete() {
    if (!session?.user) {
      router.push("/login");
      return;
    }
    if (!currentLesson) return;

    // Prevent re-entry if already saving or completed
    if (saving || progress.completed) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, watchedSeconds: progress.watchedSeconds || currentLesson?.duration || 0 }),
      });

      if (res.ok) {
        setProgress((prev) => ({ ...prev, completed: true }));
        setCompletedLessonIds((prev) => {
          const next = new Set(prev);
          next.add(currentLesson.id);
          return next;
        });
        showSuccess("Aula concluída!", `${currentLesson?.title} — XP ganho: +50 🎉`);
        // Show celebration modal
        celebrate({
          type: "xp",
          title: "Aula Concluída! 🎉",
          description: `${currentLesson?.title} — +50 XP`,
          xpGained: 50,
        });
        // Auto-navigate to next lesson after short delay
        if (nextLesson) {
          setTimeout(() => {
            closeCelebration();
            router.push(`/cursos/${courseId}/aulas/${nextLesson.id}`);
          }, 2500);
        }
      }
    } catch (err) {
      console.error("Error marking complete:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-400 border-t-white" />
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Aula não encontrada</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m}min ${s}s`;
    return `${s}s`;
  };

  // Navigation + "mark complete" buttons, reused right below the lesson
  // content and in the sticky bottom bar.
  const renderNavButtons = () => (
    <>
      <div className="flex items-center gap-2">
        {prevLesson && (
          <Link
            href={`/cursos/${courseId}/aulas/${prevLesson.id}`}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Anterior
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        {session?.user && (
          <button
            onClick={handleMarkComplete}
            disabled={saving || progress.completed}
            className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition ${
              progress.completed
                ? "bg-green-600 text-white"
                : "bg-white text-zinc-900 hover:bg-zinc-200"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {progress.completed ? (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Concluída
              </>
            ) : saving ? (
              "Salvando..."
            ) : (
              "Marcar como Concluída"
            )}
          </button>
        )}

        {nextLesson && (
          <Link
            href={`/cursos/${courseId}/aulas/${nextLesson.id}`}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
          >
            Próxima
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </>
  );

  const renderSidebar = (onNavigate?: () => void) => {
    return (
      <>
        <div className="border-b border-zinc-800 p-4">
          <Link
            href={`/cursos/${courseId}`}
            onClick={onNavigate}
            className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
          <h2 className="text-sm font-semibold text-white">{course.title}</h2>
        </div>
        <nav className="p-4">
          {course.modules.map((mod) => {
            const collapsed = collapsedModules?.has(mod.id) ?? false;
            const modCompleted = mod.lessons.filter((l) => completedLessonIds.has(l.id)).length;
            return (
            <div key={mod.id} className="mb-4">
              <h3 className="mb-2">
              <button
                type="button"
                onClick={() => toggleModule(mod.id)}
                aria-expanded={!collapsed}
                aria-label={`${collapsed ? "Expandir" : "Retrair"} ${mod.title}`}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 transition hover:bg-zinc-800/60 hover:text-zinc-300"
              >
                <span className="truncate">
                  {mod.title}
                  <span className="ml-1.5 font-normal normal-case tracking-normal text-zinc-600">
                    {modCompleted > 0 ? (
                      <span className="text-green-400">✓ {modCompleted}/{mod.lessons.length}</span>
                    ) : (
                      <>{mod.lessons.length} {mod.lessons.length === 1 ? "aula" : "aulas"}</>
                    )}
                  </span>
                </span>
                <svg
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              </h3>
              {!collapsed && (
              <ul className="space-y-1">
                {mod.lessons.map((lesson) => {
                  const isActive = lesson.id === lessonId;
                  const isCompleted = completedLessonIds.has(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/cursos/${courseId}/aulas/${lesson.id}`}
                        onClick={onNavigate}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                          isActive
                            ? "bg-zinc-700 text-white"
                            : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        }`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] transition ${
                          isCompleted ? "bg-green-500 text-white" : "border border-zinc-600 text-zinc-500"
                        }`}>
                          {isCompleted ? (
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            lesson.orderIndex
                          )}
                        </span>
                        <span className="flex-1 truncate">{lesson.title}</span>
                        {lesson.duration && (
                          <span className="shrink-0 text-[10px] text-zinc-500">
                            {formatTime(lesson.duration)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              )}
            </div>
            );
          })}
        </nav>
      </>
    );
  };

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Sidebar - Course Content (Desktop) */}
      <aside className="sticky top-0 hidden h-screen w-80 overflow-y-auto border-r border-zinc-800 bg-zinc-900 lg:block">
        {renderSidebar()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-80 transform overflow-y-auto border-r border-zinc-800 bg-zinc-900 transition-transform duration-300 ease-in-out lg:hidden ${
          showMobileMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebar(() => setShowMobileMenu(false))}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 lg:hidden"
              aria-label="Menu de aulas"
            >
              {showMobileMenu ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <Link
              href={`/cursos/${courseId}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 lg:hidden"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-sm font-medium text-white lg:text-base truncate max-w-[200px] sm:max-w-md">{currentLesson.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!session?.user ? (
              <Link
                href="/login"
                className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs text-white hover:bg-zinc-600"
              >
                Entrar para salvar progresso
              </Link>
            ) : (
              <span className="text-xs text-zinc-500">
                {progress.watchedSeconds > 0 && `${formatTime(progress.watchedSeconds)} assistidos`}
              </span>
            )}
          </div>
        </header>

        {/* Video / Content Area */}
        <div className="flex-1 overflow-auto">
          {currentLesson.contentType === "VIDEO" && currentLesson.contentUrl ? (
            <div className="mx-auto w-full max-w-5xl px-4 py-4">
              <PlayerWrapper
                url={currentLesson.contentUrl}
                initialSeconds={progress.watchedSeconds || 0}
                onProgress={() => {
                  // Progress is saved automatically by the 30-second interval
                }}
                onComplete={() => {
                  // Auto-mark complete when video ends
                  if (!progress.completed && session?.user) {
                    handleMarkComplete();
                  }
                }}
              />
              {currentLesson.contentBody && (
                <div className="mx-auto mt-10 max-w-3xl">
                  <LessonBody body={currentLesson.contentBody} />
                </div>
              )}
              {/* Inline navigation right after the lesson content */}
              <div className="mx-auto mt-10 max-w-3xl border-t border-zinc-800 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {renderNavButtons()}
                </div>
              </div>
            </div>
          ) : currentLesson.contentType === "PDF" ? (
            <div className="mx-auto max-w-3xl px-4 py-12 text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800">
                  <svg className="h-10 w-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white">{currentLesson.title}</h2>
              <p className="mb-6 text-zinc-400">Material de apoio em PDF</p>
              {currentLesson.contentUrl && (
                <a
                  href={currentLesson.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Baixar Material
                </a>
              )}
              {currentLesson.contentBody && (
                <a
                  href={currentLesson.contentBody}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-3 inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Ver Link Externo
                </a>
              )}
              {/* Inline navigation right after the lesson content */}
              <div className="mt-10 border-t border-zinc-800 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {renderNavButtons()}
                </div>
              </div>
            </div>
          ) : currentLesson.contentType === "TEXT" ? (
            <div className="mx-auto max-w-3xl px-4 py-12">
              <h2 className="mb-4 text-xl font-semibold text-white">{currentLesson.title}</h2>
              <LessonBody body={currentLesson.contentBody} />
              {/* Inline navigation right after the lesson content */}
              <div className="mt-10 border-t border-zinc-800 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {renderNavButtons()}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-12 text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800">
                  <svg className="h-10 w-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-white">{currentLesson.title}</h2>
              <p className="text-zinc-400">Link externo</p>
              {currentLesson.contentUrl && (
                <a
                  href={currentLesson.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Abrir Link
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {/* Inline navigation right after the lesson content */}
              <div className="mt-10 border-t border-zinc-800 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {renderNavButtons()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar - Navigation & Complete (sticky: always visible) */}
        <div className="sticky bottom-0 z-20 border-t border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            {renderNavButtons()}
          </div>
        </div>
      </div>

      {celebration && (
        <CelebrationModal {...celebration} onClose={closeCelebration} />
      )}
    </div>
  );
}
