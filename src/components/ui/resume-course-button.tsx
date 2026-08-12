"use client";

interface ResumeCourseButtonProps {
  courseId: string;
  loading: boolean;
  onResume: (courseId: string) => void;
  variant?: "full" | "inline";
}

/**
 * Green "▶ Continuar curso" button used inside course cards (catalog,
 * dashboard and /meus-cursos). Rendered as a <span role="button"> so it can
 * live inside the card <Link> without invalid nested-interactive HTML.
 */
export function ResumeCourseButton({
  courseId,
  loading,
  onResume,
  variant = "full",
}: ResumeCourseButtonProps) {
  // Display class lives inside each variant (not the base) so `flex` and
  // `inline-flex` never conflict in the same class attribute.
  const base =
    "cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 font-semibold text-white transition hover:bg-green-700 " +
    (loading ? "pointer-events-none opacity-60 " : "") +
    (variant === "inline"
      ? "inline-flex ml-auto shrink-0 px-3 py-1.5 text-xs"
      : "mt-3 flex w-full px-3 py-2 text-xs");

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onResume(courseId);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onResume(courseId);
        }
      }}
      aria-disabled={loading}
      className={base}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          Continuar curso
        </>
      )}
    </span>
  );
}
