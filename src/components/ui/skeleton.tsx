"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-700",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.5s_ease-in-out_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        "before:content-['']",
        className
      )}
    />
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900" aria-hidden="true">
      {/* Thumbnail */}
      <Skeleton className="mb-4 aspect-video w-full rounded-lg" />
      {/* Category badge */}
      <Skeleton className="mb-2 h-4 w-16 rounded-full" />
      {/* Title */}
      <Skeleton className="mb-2 h-5 w-3/4" />
      {/* Description (2 lines) */}
      <Skeleton className="mb-1.5 h-4 w-full" />
      <Skeleton className="mb-3 h-4 w-2/3" />
      {/* Meta row: lessons • modules • duration */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-12" />
      </div>
      {/* Rating row */}
      <Skeleton className="mt-2 h-4 w-28" />
    </div>
  );
}

export function CourseListSkeleton() {
  return (
    <div className="flex gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900" aria-hidden="true">
      {/* Thumbnail */}
      <Skeleton className="h-24 w-36 shrink-0 rounded-lg" />
      <div className="flex flex-1 flex-col justify-between">
        <div>
          {/* Category badge */}
          <Skeleton className="mb-1.5 h-3.5 w-16 rounded-full" />
          {/* Title */}
          <Skeleton className="mb-1.5 h-5 w-3/4" />
          {/* Description (1 line) */}
          <Skeleton className="h-3.5 w-full" />
        </div>
        {/* Meta row */}
        <div className="mt-2 flex items-center gap-4">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="animate-pulse border-b border-zinc-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className={`h-4 rounded bg-zinc-200 ${i === 0 ? "w-3/4" : "w-1/2"}`} />
        </td>
      ))}
    </tr>
  );
}

export function DashboardMetricSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="mt-1 h-3 w-20" />
    </div>
  );
}
