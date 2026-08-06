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
  | "admin.sales"
  | "common.home"
  | "privacy.title"
  | "privacy.updated"
  | "privacy.intro"
  | "privacy.consent"
  | "terms.title"
  | "terms.updated"
  | "terms.intro"
  | "terms.consent"
  | "preview.mode"
  | "preview.subtitle"
  | "preview.backToEditor"
  | "preview.notFound"
  | "preview.coursePreview"
  | "preview.content"
  | "preview.noModules"
  | "preview.addModules"
  | "preview.noLessons"
  | "preview.video"
  | "preview.text"
  | "preview.link";

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
    "common.home": "Início",
    "privacy.title": "Política de Privacidade",
    "privacy.updated": "Última atualização: Julho de 2026",
    "privacy.intro": "A LMS Platform leva sua privacidade a sério. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).",
    "privacy.consent": "Ao criar uma conta na LMS Platform, você declara ter lido e concordado com esta Política de Privacidade.",
    "terms.title": "Termos de Uso",
    "terms.updated": "Última atualização: Julho de 2026",
    "terms.intro": "Estes Termos de Uso regulam o acesso e a utilização da plataforma LMS Platform por seus usuários. Leia atentamente antes de criar sua conta.",
    "terms.consent": "Ao criar uma conta na LMS Platform, você declara ter lido, compreendido e concordado com estes Termos de Uso.",
    "preview.mode": "Modo Preview",
    "preview.subtitle": "— Visualização de como os alunos verão o curso",
    "preview.backToEditor": "Voltar ao Editor",
    "preview.notFound": "Curso não encontrado",
    "preview.coursePreview": "Preview do Curso",
    "preview.content": "Conteúdo do Curso",
    "preview.noModules": "Nenhum módulo adicionado ainda.",
    "preview.addModules": "Adicionar módulos",
    "preview.noLessons": "Nenhuma aula neste módulo.",
    "preview.video": "Vídeo",
    "preview.text": "Texto",
    "preview.link": "Link",
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
    "common.home": "Home",
    "privacy.title": "Privacy Policy",
    "privacy.updated": "Last updated: July 2026",
    "privacy.intro": "LMS Platform takes your privacy seriously. This policy describes how we collect, use, and protect your personal information in compliance with the Brazilian General Data Protection Law (LGPD - Law 13.709/2018).",
    "privacy.consent": "By creating an account on LMS Platform, you declare that you have read and agreed to this Privacy Policy.",
    "terms.title": "Terms of Service",
    "terms.updated": "Last updated: July 2026",
    "terms.intro": "These Terms of Service govern access to and use of the LMS Platform by its users. Please read them carefully before creating your account.",
    "terms.consent": "By creating an account on LMS Platform, you declare that you have read, understood, and agreed to these Terms of Service.",
    "preview.mode": "Preview Mode",
    "preview.subtitle": "— Preview of how students will see the course",
    "preview.backToEditor": "Back to Editor",
    "preview.notFound": "Course not found",
    "preview.coursePreview": "Course Preview",
    "preview.content": "Course Content",
    "preview.noModules": "No modules added yet.",
    "preview.addModules": "Add modules",
    "preview.noLessons": "No lessons in this module.",
    "preview.video": "Video",
    "preview.text": "Text",
    "preview.link": "Link",
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
