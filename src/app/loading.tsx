export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-white" />
        <p className="text-sm text-zinc-400 dark:text-zinc-500">Carregando...</p>
      </div>
    </div>
  );
}
