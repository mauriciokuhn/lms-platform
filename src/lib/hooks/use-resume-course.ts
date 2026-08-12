"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { showInfo } from "@/components/ui/toast-utils";

interface LessonLite {
  id: string;
  title: string;
  progress?: { userId: string; completed: boolean }[];
}

/**
 * Shared "Continuar curso" logic used by the catalog (/cursos), the student
 * dashboard and /meus-cursos.
 *
 * Given a course id it:
 *  1. Fetches the course (modules -> lessons).
 *  2. Resumes the last visited lesson (localStorage `pds-last-lesson-{courseId}`)
 *     when it is still incomplete — with a "Retomando de onde você parou" toast.
 *  3. Otherwise jumps to the first uncompleted lesson.
 *  4. If every lesson is done, opens the course page.
 */
export function useResumeCourse() {
  const router = useRouter();
  const { data: session } = useSession();
  const [continueLoading, setContinueLoading] = useState<string | null>(null);
  const busyRef = useRef(false);

  const resumeCourse = useCallback(
    async (courseId: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setContinueLoading(courseId);
      try {
        const res = await fetch(`/api/courses/${courseId}`);
        if (!res.ok) return;
        const data = await res.json();
        const modules = (data?.modules || []) as { lessons?: LessonLite[] }[];
        const lessons: LessonLite[] = modules.flatMap((m) => m.lessons || []);
        if (lessons.length === 0) {
          router.push(`/cursos/${courseId}`);
          return;
        }

        const userId = session?.user?.id;
        const isComplete = (l: LessonLite) =>
          !!userId &&
          Array.isArray(l.progress) &&
          l.progress.some((p) => p.userId === userId && p.completed);

        // 1) Resume the last visited lesson when it is still incomplete.
        let target: LessonLite | null = null;
        let resumed = false;
        try {
          const lastId = window.localStorage.getItem(`pds-last-lesson-${courseId}`);
          if (lastId) {
            const last = lessons.find((l) => l.id === lastId);
            if (last && !isComplete(last)) {
              target = last;
              resumed = true;
            }
          }
        } catch {
          // ignore
        }

        // 2) Otherwise: first uncompleted lesson.
        if (!target) {
          target = lessons.find((l) => !isComplete(l)) || null;
        }

        if (target) {
          if (resumed) {
            showInfo("Retomando de onde você parou", target.title);
          }
          router.push(`/cursos/${courseId}/aulas/${target.id}`);
        } else {
          // Every lesson is done — open the course page.
          router.push(`/cursos/${courseId}`);
        }
      } catch (err) {
        console.error("Error continuing course:", err);
      } finally {
        busyRef.current = false;
        setContinueLoading(null);
      }
    },
    [router, session]
  );

  return { resumeCourse, continueLoading };
}
