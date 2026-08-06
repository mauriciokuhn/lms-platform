import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-zinc-950">
      <div className="mx-auto max-w-md text-center">
        {/* Large 404 graphic */}
        <div className="relative mx-auto mb-8 flex h-48 w-48 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900" />
          <div className="relative">
            <span className="text-8xl font-black tracking-tight text-zinc-300 dark:text-zinc-700">
              404
            </span>
          </div>
          {/* Floating question mark */}
          <div className="absolute -right-2 -top-2 flex h-12 w-12 animate-bounce items-center justify-center rounded-full bg-amber-100 text-2xl shadow-lg dark:bg-amber-900/50">
            🤔
          </div>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white sm:text-3xl">
          Página não encontrada
        </h1>
        <p className="mt-3 text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          A página que você procura não existe, foi movida ou está temporariamente
          indisponível. Verifique o link ou volte para o início.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-zinc-800 hover:shadow-xl dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Voltar ao Início
          </Link>
          <Link
            href="/cursos"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Explorar Cursos
          </Link>
        </div>

        {/* Helpful links */}
        <div className="mt-10 border-t border-zinc-100 pt-6 dark:border-zinc-800">
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
            Talvez você esteja procurando
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { href: "/dashboard", label: "Dashboard" },
              { href: "/meus-cursos", label: "Meus Cursos" },
              { href: "/categorias", label: "Categorias" },
              { href: "/certificados", label: "Certificados" },
              { href: "/login", label: "Entrar" },
              { href: "/register", label: "Cadastre-se" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
