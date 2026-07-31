"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showValue?: boolean;
  totalReviews?: number;
}

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export function StarRating({
  rating,
  size = "sm",
  interactive = false,
  onChange,
  showValue = false,
  totalReviews,
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const displayRating = interactive && hoveredRating > 0 ? hoveredRating : rating;

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.floor(displayRating);
          const halfFilled = !filled && star === Math.ceil(displayRating) && displayRating % 1 >= 0.25;

          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onMouseEnter={() => interactive && setHoveredRating(star)}
              onMouseLeave={() => interactive && setHoveredRating(0)}
              onClick={() => {
                if (interactive && onChange) {
                  onChange(star);
                }
              }}
              className={cn(
                "transition-all",
                interactive
                  ? "cursor-pointer hover:scale-110"
                  : "cursor-default",
                size === "sm" ? "p-0" : "p-0.5"
              )}
              aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
            >
              <svg
                className={cn(
                  sizeClasses[size],
                  "transition-colors",
                  filled
                    ? "text-amber-400"
                    : halfFilled
                    ? "text-amber-300"
                    : "text-zinc-200 dark:text-zinc-700"
                )}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          );
        })}
      </div>

      {showValue && (
        <span className="ml-1 text-sm font-semibold text-zinc-900 dark:text-white">
          {displayRating.toFixed(1)}
        </span>
      )}

      {totalReviews !== undefined && (
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          ({totalReviews} {totalReviews === 1 ? "avaliação" : "avaliações"})
        </span>
      )}
    </div>
  );
}

// ──────────────────────────────────────────
// DISPLAY-ONLY DISTRIBUTION BARS
// ──────────────────────────────────────────

interface RatingDistributionProps {
  distribution: Record<number, number>;
  totalReviews: number;
}

export function RatingDistribution({
  distribution,
  totalReviews,
}: RatingDistributionProps) {
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] || 0;
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

        return (
          <div
            key={star}
            className="flex items-center gap-2 text-xs"
          >
            <span className="w-3 text-right text-zinc-500 dark:text-zinc-400">
              {star}
            </span>
            <svg className="h-3 w-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div className="group relative h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <motion.div
                className="h-full overflow-hidden rounded-full bg-amber-400"
                style={{ width: `${percentage}%` }}
              />
              {/* Tooltip on hover over the bar */}
              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[10px] text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-zinc-100 dark:text-zinc-900">
                {count} {count === 1 ? 'avaliação' : 'avaliações'} ({Math.round(percentage)}%)
              </div>
            </div>
            <span className="w-6 text-right text-zinc-400 dark:text-zinc-500">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
