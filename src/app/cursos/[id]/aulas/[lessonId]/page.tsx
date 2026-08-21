"use client";

import { useCallback, useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { showSuccess } from "@/components/ui/toast-utils";
import { useGamificationContext } from "@/lib/contexts/gamification-context";
import { PlayerWrapper } from "@/components/ui/player-wrapper";
import { useCelebration, CelebrationModal } from "@/components/ui/celebration";
import { XP_PER_LESSON } from "@/lib/xp";

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

/** Renderiza **negrito** e *itálico* dentro de um segmento de texto. */
function renderBoldItalic(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Negrito primeiro, para **texto** não ser cortado pela regra de itálico.
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  boldParts.forEach((bp, i) => {
    if (bp.startsWith("**") && bp.endsWith("**") && bp.length >= 4) {
      out.push(
        <strong key={`${key}b${i}`} className="font-semibold text-zinc-900 dark:text-white">
          {bp.slice(2, -2)}
        </strong>
      );
      return;
    }
    const italicParts = bp.split(/(\*[^*]+\*)/g);
    italicParts.forEach((ip, j) => {
      if (ip.startsWith("*") && ip.endsWith("*") && ip.length >= 2) {
        out.push(
          <em key={`${key}b${i}i${j}`} className="italic">
            {ip.slice(1, -1)}
          </em>
        );
      } else if (ip) {
        out.push(<span key={`${key}b${i}i${j}`}>{ip}</span>);
      }
    });
  });
  return out;
}

/**
 * Renderiza formatação inline: `código`, [links](url), **negrito** e
 * *itálico*. Código e links têm precedência sobre negrito/itálico.
 */
function renderInline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Código inline primeiro — conteúdo não é processado novamente.
  const segments = text.split(/(`[^`]+`)/g);
  segments.forEach((seg, i) => {
    if (seg.startsWith("`") && seg.endsWith("`") && seg.length >= 2) {
      out.push(
        <code
          key={`${key}c${i}`}
          className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.9em] text-amber-700 dark:bg-zinc-800 dark:text-amber-200"
        >
          {seg.slice(1, -1)}
        </code>
      );
      return;
    }
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let li = 0;
    while ((m = linkRe.exec(seg)) !== null) {
      if (m.index > last) {
        out.push(...renderBoldItalic(seg.slice(last, m.index), `${key}s${i}l${li}-`));
      }
      const href = m[2];
      const external = /^https?:\/\//i.test(href);
      out.push(
        <a
          key={`${key}s${i}l${li}a`}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className="font-medium text-amber-600 underline decoration-amber-600/40 underline-offset-2 hover:text-amber-500 dark:text-amber-400 dark:decoration-amber-400/40 dark:hover:text-amber-300"
        >
          {m[1]}
        </a>
      );
      li++;
      last = m.index + m[0].length;
    }
    if (last < seg.length) {
      out.push(...renderBoldItalic(seg.slice(last), `${key}s${i}l${li}-`));
    }
  });
  return out;
}

const CODE_KEYWORDS =
  /\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|from|export|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|def|print|lambda|and|or|not|None|True|False|SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|JOIN|ON|AS|GROUP|BY|ORDER|LIMIT|NULL|PRIMARY|KEY)\b/;

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Highlight básico de código (strings, números, palavras-chave e comentários)
 * — sem dependências externas. O bloco mantém fundo escuro nos dois temas.
 */
function highlightCode(code: string, key: string): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, li) => {
    // Comentário no fim da linha (//, #, --)
    const commentMatch = line.match(/(\/\/.*|#.*|--.*)$/);
    let rest = line;
    let comment: string | null = null;
    if (commentMatch) {
      comment = commentMatch[0];
      rest = line.slice(0, commentMatch.index);
    }
    const nodes: React.ReactNode[] = [];
    const stringParts = rest.split(/(['"`][^'"`]*['"`])/g);
    stringParts.forEach((part, pi) => {
      if (/^['"`]/.test(part) && /['"`]$/.test(part)) {
        nodes.push(
          <span key={`${key}${li}s${pi}`} className="text-emerald-300">
            {part}
          </span>
        );
      } else {
        const numParts = part.split(/(\b\d+(?:\.\d+)?\b)/g);
        numParts.forEach((np, ni) => {
          if (/^\d+(?:\.\d+)?$/.test(np)) {
            nodes.push(
              <span key={`${key}${li}n${pi}${ni}`} className="text-sky-300">
                {np}
              </span>
            );
          } else {
            const kwParts = np.split(/(\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|from|export|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|def|print|lambda|and|or|not|None|True|False|SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|JOIN|ON|AS|GROUP|BY|ORDER|LIMIT|NULL|PRIMARY|KEY)\b)/g);
            kwParts.forEach((kp, ki) => {
              if (CODE_KEYWORDS.test(kp)) {
                nodes.push(
                  <span key={`${key}${li}k${pi}${ni}${ki}`} className="text-violet-300">
                    {kp}
                  </span>
                );
              } else if (kp) {
                nodes.push(
                  <span key={`${key}${li}x${pi}${ni}${ki}`}>{escapeHtml(kp)}</span>
                );
              }
            });
          }
        });
      }
    });
    return (
      <div key={li} className="min-h-[1.5em]">
        {nodes}
        {comment && <span className="italic text-zinc-500">{comment}</span>}
      </div>
    );
  });
}

/** Tabela markdown: primeira linha de cabeçalho, segunda de separadores. */
function renderTable(block: string, key: string) {
  const lines = block.split("\n").filter((l) => l.trim().startsWith("|"));
  const cells = (line: string) =>
    line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
  const header = cells(lines[0] || "");
  const rows = lines.slice(2).map(cells);
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
            {header.map((h, i) => (
              <th
                key={i}
                className="px-4 py-2 text-left font-semibold text-zinc-700 dark:text-zinc-200"
              >
                {renderInline(h, `${key}h${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                  {renderInline(cell, `${key}r${ri}c${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renderiza o corpo da aula: blocos ```lang``` viram código com highlight;
 * tabelas "| a | b |", citações "> ", subtítulos "## ", listas "- "/"1. "
 * e parágrafos. Inline suporta negrito, itálico, links e código.
 */
function LessonBody({ body }: { body: string | null }) {
  if (!body) return null;
  const out: React.ReactNode[] = [];
  let partIndex = 0;

  // Separa blocos de código cercados antes de quebrar em parágrafos, para
  // que linhas em branco dentro do código não dividam o bloco.
  const segments = body.split(/```(\w*)\n?([\s\S]*?)```/g);
  for (let si = 0; si < segments.length; si += 3) {
    const before = segments[si];
    if (before && before.trim()) {
      const blocks = before
        .split(/\n{2,}/)
        .map((b) => b.trim())
        .filter(Boolean);
      for (const block of blocks) {
        const key = `p${partIndex++}`;
        if (block.startsWith("## ")) {
          out.push(
            <h3 key={key} className="pt-4 text-lg font-semibold text-amber-600 dark:text-amber-300">
              {renderInline(block.slice(3), `${key}h`)}
            </h3>
          );
        } else if (/^```/.test(block)) {
          // fallback: bloco cercado sobrevivente (sem fechamento na mesma parte)
          out.push(
            <pre key={key} className="overflow-x-auto rounded-lg bg-zinc-900 p-4 font-mono text-sm leading-relaxed text-zinc-200">
              {block.replace(/^```\w*\n?/, "").trim()}
            </pre>
          );
        } else if (/^\s*\|.*\|\s*$/.test(block) && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+/.test(block.split("\n")[1] || "")) {
          out.push(<div key={key}>{renderTable(block, key)}</div>);
        } else if (/^>\s/m.test(block)) {
          const quoteLines = block
            .split("\n")
            .filter((l) => l.trim().startsWith(">"))
            .map((l) => l.trim().replace(/^>\s?/, ""));
          out.push(
            <blockquote
              key={key}
              className="border-l-4 border-amber-500/50 bg-zinc-100 py-2 pl-4 pr-3 italic text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {quoteLines.map((ql, j) => (
                <p key={j} className="not-italic">
                  {renderInline(ql, `${key}q${j}`)}
                </p>
              ))}
            </blockquote>
          );
        } else if (/^[-*]\s/m.test(block)) {
          const items = block
            .split(/\n/)
            .filter((l) => /^[-*]\s/.test(l.trim()))
            .map((l) => l.trim().replace(/^[-*]\s/, ""));
          out.push(
            <ul key={key} className="list-disc space-y-1.5 pl-5 text-zinc-700 dark:text-zinc-300">
              {items.map((item, j) => (
                <li key={j} className="leading-relaxed">
                  {renderInline(item, `${key}ul${j}`)}
                </li>
              ))}
            </ul>
          );
        } else if (/^\d+\.\s/.test(block)) {
          const items = block
            .split(/\n/)
            .filter((l) => /^\d+\.\s/.test(l.trim()))
            .map((l) => l.trim().replace(/^\d+\.\s/, ""));
          out.push(
            <ol key={key} className="list-decimal space-y-1.5 pl-5 text-zinc-700 dark:text-zinc-300">
              {items.map((item, j) => (
                <li key={j} className="leading-relaxed">
                  {renderInline(item, `${key}ol${j}`)}
                </li>
              ))}
            </ol>
          );
        } else {
          out.push(
            <p key={key} className="leading-relaxed text-zinc-700 dark:text-zinc-300">
              {renderInline(block, key)}
            </p>
          );
        }
      }
    }
    // Bloco de código cercado
    if (si + 2 < segments.length) {
      const lang = segments[si + 1];
      const code = segments[si + 2];
      out.push(
        <div key={`code${si}`} className="overflow-hidden rounded-lg bg-zinc-900">
          {lang && (
            <div className="border-b border-zinc-800 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {lang}
            </div>
          )}
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-zinc-200">
            <code>{highlightCode(code, `c${si}`)}</code>
          </pre>
        </div>
      );
    }
  }
  return <div className="space-y-4">{out}</div>;
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
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  // Highest watchedSeconds already persisted — prevents saving a lower
  // value than the server has (the route REPLACES watchedSeconds).
  const lastSavedSecondsRef = useRef(0);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const { celebration, celebrate, closeCelebration } = useCelebration();
  const { refetchProgress, progress: gamificationProgress } = useGamificationContext();
  // Last known level — used to detect level-up and show a real XP toast.
  const prevLevelRef = useRef<number | null>(null);
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
      lastSavedSecondsRef.current = progressData?.watchedSeconds || 0;
    } catch (err) {
      console.error("Error loading lesson:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId, router, session]);

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, [loadData]);

  // Remember the current level so we can detect level-ups on completion.
  useEffect(() => {
    if (gamificationProgress && prevLevelRef.current === null) {
      prevLevelRef.current = gamificationProgress.xp.level;
    }
  }, [gamificationProgress]);

  // Initialize collapsed state: restore from localStorage when present,
  // otherwise collapse every module except the current lesson's module.
  // Deferred read so the setState is not synchronous within the effect
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (collapsedModules !== null || !course) return;
    const storageKey = `pds-collapsed-modules-${course.id}`;
    (async () => {
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
    })();
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

  // Persist real playback time (fires from PlayerWrapper every 15s while
  // playing). Never saves a value lower than what was already persisted.
  const saveWatchedSeconds = useCallback(
    async (seconds: number) => {
      if (!session?.user) return;
      const safe = Math.max(0, Math.floor(seconds));
      if (safe <= lastSavedSecondsRef.current) return;
      lastSavedSecondsRef.current = safe;
      try {
        await fetch(`/api/lessons/${lessonId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchedSeconds: safe }),
        });
      } catch (err) {
        console.error("Error saving progress:", err);
      }
    },
    [session, lessonId]
  );

  // Video lessons report real playback time via PlayerWrapper's onProgress.
  // Text/PDF lessons fall back to a reading-time estimate while the page is
  // visible (paused tabs no longer inflate the counter).
  useEffect(() => {
    if (!currentLesson || !session?.user || progress.completed) return;
    if (currentLesson.contentType === "VIDEO") return;

    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
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

  // Keyboard navigation: ← previous lesson, → next lesson (ignored while
  // typing or when a celebration modal is open).
  useEffect(() => {
    if (!prevLesson && !nextLesson) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      if (celebration) return;
      if (e.key === "ArrowLeft" && prevLesson) {
        e.preventDefault();
        router.push(`/cursos/${courseId}/aulas/${prevLesson.id}`);
      } else if (e.key === "ArrowRight" && nextLesson) {
        e.preventDefault();
        router.push(`/cursos/${courseId}/aulas/${nextLesson.id}`);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prevLesson, nextLesson, celebration, router, courseId]);

  // Close the mobile drawer with Escape + move focus into it when opened.
  useEffect(() => {
    if (!showMobileMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMobileMenu(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const firstFocusable = mobileDrawerRef.current?.querySelector<HTMLElement>("a, button");
    firstFocusable?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [showMobileMenu]);

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
        showSuccess("Aula concluída!", `${currentLesson?.title} — XP ganho: +${XP_PER_LESSON} 🎉`);
        // Refresh gamification data and toast when the student levels up
        const fresh = await refetchProgress();
        if (fresh && prevLevelRef.current !== null && fresh.xp.level > prevLevelRef.current) {
          showSuccess(`Subiu para o nível ${fresh.xp.level}! 🏆`, "Continue estudando para ganhar ainda mais XP.");
        }
        if (fresh) {
          prevLevelRef.current = fresh.xp.level;
        }
        // Show celebration modal
        celebrate({
          type: "xp",
          title: "Aula Concluída! 🎉",
          description: `${currentLesson?.title} — +${XP_PER_LESSON} XP`,
          xpGained: XP_PER_LESSON,
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700" />
            <div className="absolute inset-0 flex items-center justify-center text-lg">🎬</div>
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Carregando aula...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 px-4 text-center dark:bg-zinc-950">
        <p className="text-4xl">⚠️</p>
        <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Não foi possível carregar a aula.</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">Verifique sua conexão e tente novamente.</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(false);
            setLoading(true);
            void loadData();
          }}
          className="mt-2 rounded-lg bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <p className="text-5xl mb-4">📖</p>
          <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Aula não encontrada</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">A aula pode ter sido removida ou o link está incorreto.</p>
          <Link href={`/cursos/${courseId}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Voltar ao curso
          </Link>
        </div>
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

  // "Próxima aula" suggestion + course progress summary — shown inline after
  // the lesson content (never inside the sticky bottom bar).
  const NextLessonCard = () => {
    const totalLessons = allLessons.length;
    const completedCount = completedLessonIds.size;
    const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    // Estimated seconds per lesson: explicit duration when set, otherwise a
    // reading-time estimate from the text body (~20 chars/second, min 1 min).
    const lessonSeconds = (l: Lesson) => {
      if (l.duration && l.duration > 0) return l.duration;
      if (l.contentType === "TEXT" && l.contentBody) {
        return Math.max(60, Math.round(l.contentBody.length / 20));
      }
      return 0;
    };
    const totalSeconds = allLessons.reduce((acc, l) => acc + lessonSeconds(l), 0);
    const remainingSeconds = allLessons
      .filter((l) => !completedLessonIds.has(l.id))
      .reduce((acc, l) => acc + lessonSeconds(l), 0);
    return (
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Progresso do curso
          </span>
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {completedCount}/{totalLessons} aulas · {percentage}%
          </span>
        </div>
        <div className="px-5 py-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        {totalSeconds > 0 && (
          <div className="flex items-center gap-1.5 px-5 pb-2.5 text-[11px] text-zinc-500 dark:text-zinc-500">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate">
              Tempo restante estimado:{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatTime(remainingSeconds)}</span>
            </span>
            <span className="ml-auto shrink-0 text-zinc-500 dark:text-zinc-600">Total: {formatTime(totalSeconds)}</span>
          </div>
        )}
        {nextLesson ? (
          <div className="flex items-center justify-between gap-4 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Próxima aula</p>
              <p className="mt-0.5 truncate text-sm font-medium text-zinc-900 dark:text-white">{nextLesson.title}</p>
            </div>
            <Link
              href={`/cursos/${courseId}/aulas/${nextLesson.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-amber-400"
            >
              Assistir
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="border-t border-zinc-200 px-5 py-4 text-sm font-medium text-green-600 dark:border-zinc-800 dark:text-green-400">
            🎉 Você concluiu todas as aulas do curso!
          </div>
        )}
      </div>
    );
  };

  // Navigation + "mark complete" buttons, reused right below the lesson
  // content and in the sticky bottom bar.
  const renderNavButtons = () => (
    <>
      <div className="flex items-center gap-2">
        {prevLesson && (
          <Link
            href={`/cursos/${courseId}/aulas/${prevLesson.id}`}
            className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
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
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
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
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
          <Link
            href={`/cursos/${courseId}`}
            onClick={onNavigate}
            className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{course.title}</h2>
          {nextLesson && (
            <Link
              href={`/cursos/${courseId}/aulas/${nextLesson.id}`}
              onClick={onNavigate}
              className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs transition hover:bg-amber-500/20"
            >
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Próxima
              </span>
              <span className="truncate font-medium text-zinc-900 dark:text-white">{nextLesson.title}</span>
              <svg className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
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
                className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300"
              >
                <span className="truncate">
                  {mod.title}
                  <span className="ml-1.5 font-normal normal-case tracking-normal text-zinc-500 dark:text-zinc-600">
                    {modCompleted > 0 ? (
                      <span className="text-green-600 dark:text-green-400">✓ {modCompleted}/{mod.lessons.length}</span>
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
                            ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-white"
                            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                        }`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] transition ${
                          isCompleted ? "bg-green-500 text-white" : "border border-zinc-300 text-zinc-500 dark:border-zinc-600"
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
                          <span className="shrink-0 text-[10px] text-zinc-500 dark:text-zinc-500">
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
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar - Course Content (Desktop) */}
      <aside className="sticky top-0 hidden h-screen w-80 overflow-y-auto border-r border-zinc-200 bg-white lg:block dark:border-zinc-800 dark:bg-zinc-900">
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
        ref={mobileDrawerRef}
        id="mobile-lesson-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de aulas"
        className={`fixed inset-y-0 left-0 z-40 w-80 transform overflow-y-auto border-r border-zinc-200 bg-white transition-transform duration-300 ease-in-out lg:hidden dark:border-zinc-800 dark:bg-zinc-900 ${
          showMobileMenu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebar(() => setShowMobileMenu(false))}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 lg:hidden dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              aria-label="Menu de aulas"
              aria-expanded={showMobileMenu}
              aria-controls="mobile-lesson-drawer"
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
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 lg:hidden dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="max-w-[200px] truncate text-sm font-medium text-zinc-900 sm:max-w-md lg:text-base dark:text-white">{currentLesson.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!session?.user ? (
              <Link
                href="/login"
                className="rounded-lg bg-zinc-200 px-3 py-1.5 text-xs text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
              >
                Entrar para salvar progresso
              </Link>
            ) : (
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
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
                onProgress={(seconds) => {
                  // Real playback time (HTML5 + YouTube via postMessage).
                  setProgress((prev) => {
                    const next = Math.max(prev.watchedSeconds, seconds);
                    return next === prev.watchedSeconds ? prev : { ...prev, watchedSeconds: next };
                  });
                  void saveWatchedSeconds(seconds);
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
              <div className="mx-auto mt-10 max-w-3xl border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {renderNavButtons()}
                </div>
                {NextLessonCard()}
              </div>
            </div>
          ) : currentLesson.contentType === "PDF" ? (
            <div className="mx-auto max-w-3xl px-4 py-12 text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <svg className="h-10 w-10 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">{currentLesson.title}</h2>
              <p className="mb-6 text-zinc-500 dark:text-zinc-400">Material de apoio em PDF</p>
              {currentLesson.contentUrl && (
                <a
                  href={currentLesson.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
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
                  className="ml-3 inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Ver Link Externo
                </a>
              )}
              {/* Inline navigation right after the lesson content */}
              <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {renderNavButtons()}
                </div>
                {NextLessonCard()}
              </div>
            </div>
          ) : currentLesson.contentType === "TEXT" ? (
            <div className="mx-auto max-w-3xl px-4 py-12">
              <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">{currentLesson.title}</h2>
              <LessonBody body={currentLesson.contentBody} />
              {/* Inline navigation right after the lesson content */}
              <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {renderNavButtons()}
                </div>
                {NextLessonCard()}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-12 text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <svg className="h-10 w-10 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">{currentLesson.title}</h2>
              <p className="text-zinc-500 dark:text-zinc-400">Link externo</p>
              {currentLesson.contentUrl && (
                <a
                  href={currentLesson.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                >
                  Abrir Link
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {/* Inline navigation right after the lesson content */}
              <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {renderNavButtons()}
                </div>
                {NextLessonCard()}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar - Navigation & Complete (mobile only: on desktop the
            inline nav right below the lesson content is already visible, so
            a second copy of the CTA would duplicate the buttons) */}
        <div className="sticky bottom-0 z-20 border-t border-zinc-200 bg-white px-4 py-3 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
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
