"use client";

import { StarRating } from "@/components/ui/star-rating";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return "agora mesmo";
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays < 30) return `há ${diffDays}d`;
  if (diffMonths < 12) return `há ${diffMonths}${diffMonths === 1 ? "mês" : "meses"}`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export function ReviewList({ reviews, currentUserId }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <svg className="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Nenhuma avaliação ainda.
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Seja o primeiro a avaliar este curso!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const isCurrentUser = review.user.id === currentUserId;

        return (
          <div
            key={review.id}
            className={`rounded-xl border p-4 transition ${
              isCurrentUser
                ? "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                  {review.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- user avatar
                    <img
                      src={review.user.image}
                      alt={review.user.name || ""}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    (review.user.name || review.user.email)[0].toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {review.user.name || review.user.email}
                    </span>
                    {isCurrentUser && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        Você
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size="sm" />
                    <span className="text-[10px] text-zinc-400">
                      {timeAgo(review.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {review.comment && (
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {review.comment}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
