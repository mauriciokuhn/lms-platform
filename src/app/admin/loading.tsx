export default function AdminLoading() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 h-8 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
            <div className="mb-3 h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="mb-2 h-8 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
          <div className="h-5 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-zinc-100 p-4 last:border-0 dark:border-zinc-800">
            <div className="h-4 flex-1 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
