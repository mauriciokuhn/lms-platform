export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
      <div className="text-center">
        {/* Branded loader */}
        <div className="relative mx-auto mb-6 h-16 w-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/20" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">📚</div>
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-zinc-200 border-t-amber-500 dark:border-zinc-700 dark:border-t-amber-400" />
        </div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Ponto do Saber</p>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Carregando...</p>
      </div>
    </div>
  );
}
