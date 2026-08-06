import { Skeleton } from "@/components/ui/skeleton";

export default function CourseDetailLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Hero Section */}
      <div className="border-b border-zinc-200 bg-gradient-to-b from-zinc-50 to-white px-4 py-12 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
        <div className="mx-auto max-w-4xl">
          <Skeleton className="mb-2 h-4 w-28 rounded-full" />
          <Skeleton className="mb-3 h-10 w-3/4" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-6 h-4 w-2/3" />

          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>

          <div className="mt-6 flex gap-3">
            <Skeleton className="h-12 w-40 rounded-xl" />
            <Skeleton className="h-12 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Instructor */}
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div>
            <Skeleton className="mb-1 h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>

        {/* Modules */}
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="mb-1 h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <Skeleton className="mb-4 h-6 w-36" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="mb-3 flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="mb-1 h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="mb-1 h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
