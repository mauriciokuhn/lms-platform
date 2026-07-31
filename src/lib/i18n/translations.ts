export type Locale = "pt-BR" | "en";

export type TranslationKey =
  | "nav.cursos"
  | "nav.entrar"
  | "nav.cadastrar"
  | "nav.dashboard"
  | "nav.instrutores"
  | "hero.title"
  | "hero.subtitle"
  | "hero.stats.students"
  | "hero.stats.courses"
  | "hero.stats.lessons"
  | "hero.cta.start"
  | "hero.cta.browse"
  | "hero.demo"
  | "section.features"
  | "section.testimonials"
  | "section.faq"
  | "section.cta.title"
  | "section.cta.subtitle"
  | "section.cta.start"
  | "section.cta.explore"
  | "course.enroll"
  | "course.enrolled"
  | "course.continue"
  | "course.start"
  | "course.modules"
  | "course.lessons"
  | "course.students"
  | "course.free"
  | "course.reviews"
  | "course.noReviews"
  | "common.loading"
  | "common.noResults"
  | "common.search"
  | "common.allCategories"
  | "common.sort.recent"
  | "common.sort.rating"
  | "common.sort.reviews"
  | "common.sort.students"
  | "common.by"
  | "footer.platform"
  | "footer.courses"
  | "footer.resources"
  | "footer.legal"
  | "footer.privacy"
  | "footer.terms"
  | "footer.rights"
  | "admin.dashboard"
  | "admin.courses"
  | "admin.analytics"
  | "admin.students"
  | "admin.sales";

const translations: Record<Locale, Record<TranslationKey, string>> = {
  "pt-BR": {
    "nav.cursos": "Cursos",
    "nav.entrar": "Entrar",
    "nav.cadastrar": "Cadastre-se",
    "nav.dashboard": "Dashboard",
    "nav.instrutores": "Instrutores",
    "hero.title": "Aprenda com os melhores",
    "hero.subtitle": "Plataforma completa de cursos online com videoaulas, questionários interativos, certificados digitais e acompanhamento inteligente de progresso.",
    "hero.stats.students": "Alunos",
    "hero.stats.courses": "Cursos",
    "hero.stats.lessons": "Aulas",
    "hero.cta.start": "Começar Agora →",
    "hero.cta.browse": "Ver Cursos",
    "hero.demo": "Experimentar sem Login — Modo demonstração — dados não são salvos",
    "section.features": "Tudo que você precisa em um só lugar",
    "section.testimonials": "O que nossos alunos dizem",
    "section.faq": "Perguntas Frequentes",
    "section.cta.title": "Pronto para começar sua jornada?",
    "section.cta.subtitle": "Junte-se a milhares de alunos e transforme seu futuro. Crie sua conta grátis em segundos.",
    "section.cta.start": "Criar Conta Grátis",
    "section.cta.explore": "Explorar Cursos",
    "course.enroll": "Matricular-se Grátis",
    "course.enrolled": "Matriculado",
    "course.continue": "Continuar Estudos",
    "course.start": "Começar Curso",
    "course.modules": "módulos",
    "course.lessons": "aulas",
    "course.students": "alunos",
    "course.free": "Grátis",
    "course.reviews": "avaliações",
    "course.noReviews": "Nenhuma avaliação ainda",
    "common.loading": "Carregando...",
    "common.noResults": "Nenhum resultado encontrado",
    "common.search": "Buscar cursos...",
    "common.allCategories": "Todas as categorias",
    "common.sort.recent": "Mais recentes",
    "common.sort.rating": "Melhor avaliados",
    "common.sort.reviews": "Mais avaliados",
    "common.sort.students": "Mais alunos",
    "common.by": "Por",
    "footer.platform": "Plataforma",
    "footer.courses": "Cursos Online",
    "footer.resources": "Recursos",
    "footer.legal": "Legal",
    "footer.privacy": "Privacidade",
    "footer.terms": "Termos de Uso",
    "footer.rights": "Todos os direitos reservados.",
    "admin.dashboard": "Dashboard",
    "admin.courses": "Cursos",
    "admin.analytics": "Analytics",
    "admin.students": "Alunos",
    "admin.sales": "Vendas",
  },
  en: {
    "nav.cursos": "Courses",
    "nav.entrar": "Sign In",
    "nav.cadastrar": "Sign Up",
    "nav.dashboard": "Dashboard",
    "nav.instrutores": "Instructors",
    "hero.title": "Learn from the best",
    "hero.subtitle": "Complete online learning platform with video lessons, interactive quizzes, digital certificates, and smart progress tracking.",
    "hero.stats.students": "Students",
    "hero.stats.courses": "Courses",
    "hero.stats.lessons": "Lessons",
    "hero.cta.start": "Get Started →",
    "hero.cta.browse": "Browse Courses",
    "hero.demo": "Try without Login — Demo mode — data is not saved",
    "section.features": "Everything you need in one place",
    "section.testimonials": "What our students say",
    "section.faq": "Frequently Asked Questions",
    "section.cta.title": "Ready to start your journey?",
    "section.cta.subtitle": "Join thousands of students and transform your future. Create your free account in seconds.",
    "section.cta.start": "Create Free Account",
    "section.cta.explore": "Explore Courses",
    "course.enroll": "Enroll for Free",
    "course.enrolled": "Enrolled",
    "course.continue": "Continue Learning",
    "course.start": "Start Course",
    "course.modules": "modules",
    "course.lessons": "lessons",
    "course.students": "students",
    "course.free": "Free",
    "course.reviews": "reviews",
    "course.noReviews": "No reviews yet",
    "common.loading": "Loading...",
    "common.noResults": "No results found",
    "common.search": "Search courses...",
    "common.allCategories": "All categories",
    "common.sort.recent": "Most recent",
    "common.sort.rating": "Best rated",
    "common.sort.reviews": "Most reviewed",
    "common.sort.students": "Most students",
    "common.by": "By",
    "footer.platform": "Platform",
    "footer.courses": "Online Courses",
    "footer.resources": "Resources",
    "footer.legal": "Legal",
    "footer.privacy": "Privacy",
    "footer.terms": "Terms of Service",
    "footer.rights": "All rights reserved.",
    "admin.dashboard": "Dashboard",
    "admin.courses": "Courses",
    "admin.analytics": "Analytics",
    "admin.students": "Students",
    "admin.sales": "Sales",
  },
};

export function getTranslations(locale: Locale) {
  return translations[locale] || translations["pt-BR"];
}

export function getFlag(locale: Locale): string {
  return locale === "pt-BR" ? "🇧🇷" : "🇺🇸";
}

export function getLabel(locale: Locale): string {
  return locale === "pt-BR" ? "Português" : "English";
}
