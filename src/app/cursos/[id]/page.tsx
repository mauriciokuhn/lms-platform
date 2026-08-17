"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useSession, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StarRating, RatingDistribution } from "@/components/ui/star-rating";
import { ReviewForm } from "@/components/ui/review-form";
import { ReviewList } from "@/components/ui/review-list";
import { showSuccess, showError } from "@/components/ui/toast-utils";

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  contentUrl: string | null;
  duration: number | null;
  orderIndex: number;
  progress: { completed: boolean; watchedSeconds: number | null }[];
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: Lesson[];
}

interface Quiz {
  id: string;
  title: string;
  passingScore: number;
  _count: { attempts?: number };
}

interface InstructorInfo {
  id: string;
  name: string | null;
  headline: string | null;
  image: string | null;
  bio: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string | null;
  price: number | null;
  published: boolean;
  instructor: InstructorInfo | null;
  modules: Module[];
  quizzes: Quiz[];
  _count: { enrollments: number };
}

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  // Lesson to resume: last visited (localStorage, written by the lesson
  // page), falling back to the first uncompleted lesson, then the first one.
  const [resumeLessonId, setResumeLessonId] = useState<string | null>(null);
  // Whether the resume target came from a saved position (pds-last-lesson) vs.
  // the default fallback — the CTA reads "Continuar Estudos" only when there
  // is something to actually resume.
  const [resumedFromSaved, setResumedFromSaved] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number> | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [userReview, setUserReview] = useState<Review | null>(null);

  const loadReviews = useCallback(async () => {
    const userId = session?.user?.id;
    try {
      const res = await fetch(`/api/courses/${id}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        setAverageRating(data.averageRating);
        setTotalReviews(data.totalReviews);
        setRatingDistribution(data.distribution || null);

        // Find current user's review
        if (userId) {
          const mine = data.reviews.find(
            (r: Review) => r.user.id === userId
          );
          setUserReview(mine || null);
        }
      }
    } catch {
      // silent
    } finally {
      setReviewsLoading(false);
    }
  }, [id, session?.user?.id]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/courses/${id}`);
        if (!res.ok) {
          router.push("/cursos");
          return;
        }
        const data = await res.json();
        setCourse(data);

        if (session?.user) {
          const enrollRes = await fetch(`/api/enrollments/check?courseId=${id}`);
          if (enrollRes.ok) {
            const data = await enrollRes.json();
            setIsEnrolled(data.enrolled);
          }
        }
      } catch (err) {
        console.error("Error loading course:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, router, session]);

  // Load reviews separately
  useEffect(() => {
    if (!loading || !session?.user) return;
    (async () => {
      await loadReviews();
    })();
  }, [loading, session, loadReviews]);

  async function handleEnroll() {
    // The session can still be hydrating when the user clicks right after
    // page load — resolve it explicitly so an enrollment isn't misread as
    // "not logged in" (which would bounce the user to /login).
    const currentSession = (await getSession()) ?? session;
    if (!currentSession?.user) {
      router.push("/login");
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch(`/api/courses/${id}/enroll`, {
        method: "POST",
      });

      if (res.ok) {
        setIsEnrolled(true);
        showSuccess("Matrícula realizada!", "Você agora está matriculado neste curso.");
      } else {
        const data = await res.json();
        showError(data.error || "Erro ao se matricular");
      }
    } catch (err) {
      console.error("Error enrolling:", err);
      showError("Erro de conexão. Tente novamente.");
    } finally {
      setEnrolling(false);
    }
  }

  // Resolve where "Continuar Estudos" should go — the lesson page already
  // persists the last visited lesson in localStorage (pds-last-lesson-{id}),
  // so the CTA can resume exactly where the student stopped instead of
  // always pointing back at the first lesson.
  useEffect(() => {
    if (!course || resumeLessonId !== null) return;
    // Deferred read so the setState is not synchronous within the effect
    // (react-hooks/set-state-in-effect).
    (async () => {
      try {
        const saved = window.localStorage.getItem(`pds-last-lesson-${course.id}`);
        const exists =
          saved &&
          course.modules.some((m) => m.lessons.some((l) => l.id === saved));
        if (exists) {
          setResumeLessonId(saved);
          setResumedFromSaved(true);
          return;
        }
      } catch {
        // corrupted/blocked storage — fall through to the default below
      }
      // Fallback: first uncompleted lesson, else the very first one.
      for (const mod of course.modules) {
        for (const lesson of mod.lessons) {
          if (!lesson.progress?.[0]?.completed) {
            setResumeLessonId(lesson.id);
            setResumedFromSaved(false);
            return;
          }
        }
      }
      setResumeLessonId(course.modules[0]?.lessons[0]?.id ?? null);
      setResumedFromSaved(false);
    })();
  }, [course, resumeLessonId]);

  // First lesson with incomplete progress (secondary "resume" link).
  const firstUncompletedLessonId = (() => {
    if (!course) return null;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (!lesson.progress?.[0]?.completed) return lesson.id;
      }
    }
    return null;
  })();

  function getTotalLessons(modules: Module[]) {
    return modules.reduce((acc, m) => acc + m.lessons.length, 0);
  }

  function getCompletedLessons(modules: Module[]) {
    return modules.reduce((acc, m) =>
      acc + m.lessons.filter((l) => l.progress?.[0]?.completed).length, 0
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500 dark:text-zinc-400">Curso não encontrado</p>
      </div>
    );
  }

  const totalLessons = getTotalLessons(course.modules);
  const completedLessons = getCompletedLessons(course.modules);
  const progressPercentage = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}min ${s}s` : `${m}min`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link
            href="/cursos"
            className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para cursos
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{course.title}</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">{course.description}</p>
          
          {/* Instructor info */}
          {course.instructor && (
            <Link
              href={`/instrutores/${course.instructor.id}`}
              className="mt-3 inline-flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 text-sm font-bold text-white dark:from-zinc-500 dark:to-zinc-400">
                {course.instructor.name?.[0] || "?"}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {course.instructor.name}
                </p>
                {course.instructor.headline && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {course.instructor.headline}
                  </p>
                )}
              </div>
            </Link>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm text-zinc-400 dark:text-zinc-500">
            <span>{course.modules.length} módulos</span>
            <span>{totalLessons} aulas</span>
            <span>{course._count.enrollments} alunos</span>
            <span>{course.price === 0 || course.price === null ? "Grátis" : `R$ ${course.price}`}</span>
          </div>

          {isEnrolled && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Seu progresso</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="mt-1 h-2 w-full max-w-md overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPercentage === 100 ? "bg-green-500" : "bg-zinc-900 dark:bg-zinc-100"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-6">
            {isEnrolled ? (
              <div className="flex items-center gap-3">
                {resumeLessonId && (
                  <Link
                    href={`/cursos/${id}/aulas/${resumeLessonId}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-6 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    {progressPercentage > 0 || resumedFromSaved ? "Continuar Estudos" : "Começar Curso"}
                  </Link>
                )}
                {firstUncompletedLessonId &&
                  firstUncompletedLessonId !== resumeLessonId && (
                    <Link
                      href={`/cursos/${id}/aulas/${firstUncompletedLessonId}`}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      Ir para última aula não concluída
                    </Link>
                  )}
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 dark:bg-white px-6 py-2.5 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enrolling ? (
                  "Matriculando..."
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Matricular-se Grátis
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Quizzes Section */}
        {course.quizzes.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">Questionários</h2>
            <div className="space-y-3">
              {course.quizzes.map((quiz) => (
                <Link
                  key={quiz.id}
                  href={isEnrolled ? `/cursos/${id}/quiz/${quiz.id}` : "#"}
                  onClick={(e) => {
                    if (!isEnrolled) {
                      e.preventDefault();
                      showError("Matricule-se no curso para acessar o questionário");
                    }
                  }}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 shadow-sm transition hover:shadow-md dark:hover:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-900 dark:text-white">{quiz.title}</h3>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        Nota mínima: {quiz.passingScore}% | {quiz._count.attempts ?? 0} tentativa(s)
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {isEnrolled ? "Acessar →" : "🔒"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <section className="mb-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Avaliações</h2>
            {!reviewsLoading && (
              <div className="mt-4">
                {/* Average rating + star summary */}
                {averageRating ? (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {averageRating.toFixed(1)}
                    </span>
                    <div>
                      <StarRating rating={averageRating} size="sm" />
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {totalReviews} {totalReviews === 1 ? "avaliação" : "avaliações"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">
                    {totalReviews === 0 ? "Nenhuma avaliação ainda" : `${totalReviews} avaliações`}
                  </span>
                )}

                {/* Rating distribution bars */}
                {ratingDistribution && totalReviews > 0 && (
                  <div className="mt-4 max-w-xs">
                    <RatingDistribution
                      distribution={ratingDistribution}
                      totalReviews={totalReviews}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Review Form (only for enrolled students) */}
          {isEnrolled && session?.user && (
            <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <ReviewForm
                courseId={id}
                existingReview={userReview}
                onReviewSubmitted={() => loadReviews()}
              />
            </div>
          )}

          {/* Review List */}
          {reviewsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
            </div>
          ) : (
            <ReviewList reviews={reviews} currentUserId={session?.user?.id} />
          )}
        </section>

        {/* Module / Lesson List */}
        <h2 className="mb-6 text-lg font-semibold text-zinc-900 dark:text-white">Conteúdo do Curso</h2>
        <div className="space-y-4">
          {course.modules.map((mod) => (
            <div
              key={mod.id}
              className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm"
            >
              <div className="border-b border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-6 py-3">
                <h3 className="font-semibold text-zinc-900 dark:text-white">
                  <span className="text-zinc-400 dark:text-zinc-500">{mod.orderIndex}.</span> {mod.title}
                </h3>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {mod.lessons.map((lesson) => {
                  const isCompleted = lesson.progress?.[0]?.completed;
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between px-6 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          isCompleted
                            ? "bg-green-500"
                            : "border border-zinc-300 dark:border-zinc-600"
                        }`}>
                          {isCompleted ? (
                            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                        </span>

                        {lesson.contentType === "VIDEO" ? (
                          <svg className="h-4 w-4 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : lesson.contentType === "PDF" ? (
                          <svg className="h-4 w-4 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}

                        {isEnrolled ? (
                          <Link
                            href={`/cursos/${id}/aulas/${lesson.id}`}
                            className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                          >
                            {lesson.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            {lesson.title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {lesson.duration && (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            {formatDuration(lesson.duration)}
                          </span>
                        )}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          lesson.contentType === "VIDEO"
                            ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                            : lesson.contentType === "PDF"
                            ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
                            : lesson.contentType === "LINK"
                            ? "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400"
                            : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400"
                        }`}>
                          {lesson.contentType}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
