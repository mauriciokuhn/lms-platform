import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.certificate.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // Create admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@lms.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      plan: "ENTERPRISE",
    },
  });
  console.log(`  ✅ Admin: admin@lms.com / admin123 (Enterprise)`);

  // Create instructors
  const instructorPassword = await bcrypt.hash("instrutor123", 10);
  const [lucas, carla, rafael] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Lucas Mendes", email: "lucas@lms.com", passwordHash: instructorPassword, role: "INSTRUCTOR",
        headline: "Desenvolvedor Full Stack há 8 anos",
        bio: "Trabalhei em empresas como Nubank e Stone. Apaixonado por ensinar JavaScript, React e Node.js para novos desenvolvedores.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Carla Souza", email: "carla@lms.com", passwordHash: instructorPassword, role: "INSTRUCTOR",
        headline: "Cientista de Dados | PhD em Estatística",
        bio: "Doutora em Estatística pela USP. Ensino Python, Data Science e Machine Learning há mais de 5 anos. Autora de 3 livros sobre análise de dados.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Rafael Torres", email: "rafael@lms.com", passwordHash: instructorPassword, role: "INSTRUCTOR",
        headline: "Designer de Produto Sênior | UX Specialist",
        bio: "Designer há 10 anos com passagens por Globo e iFood. Especialista em UI/UX, Design Systems e pesquisa com usuários.",
      },
    }),
  ]);
  console.log(`  ✅ Instrutores criados (senha: instrutor123)`);

  // Create students
  const studentPassword = await bcrypt.hash("123456", 10);
  const [maria, joao, ana] = await Promise.all([
    prisma.user.create({ data: { name: "Maria Silva", email: "maria@email.com", passwordHash: studentPassword, role: "STUDENT" } }),
    prisma.user.create({ data: { name: "João Santos", email: "joao@email.com", passwordHash: studentPassword, role: "STUDENT" } }),
    prisma.user.create({ data: { name: "Ana Oliveira", email: "ana@email.com", passwordHash: studentPassword, role: "STUDENT" } }),
  ]);
  // Create demo user
  const demoPassword = await bcrypt.hash("demo123", 10);
  await prisma.user.create({
    data: {
      name: "Usuário Demo",
      email: "demo@lms.com",
      passwordHash: demoPassword,
      role: "STUDENT",
    },
  });
  console.log(`  ✅ Demo: demo@lms.com / demo123`);
  console.log(`  ✅ Alunos criados (senha: 123456)`);

  const instructorMap: Record<string, string> = {
    "Programação": lucas.id,
    "Front-end": lucas.id,
    "Back-end": lucas.id,
    "Data Science": carla.id,
    "Design": rafael.id,
    "Banco de Dados": carla.id,
  };

  const coursesData = [
    {
      title: "Introdução ao JavaScript", category: "Programação", inst: "lucas",
      description: "Aprenda os fundamentos do JavaScript moderno: variáveis, funções, objetos, arrays, DOM, eventos e muito mais.",
      modules: [
        { title: "Fundamentos", lessons: [
          { title: "O que é JavaScript?", ct: "VIDEO", url: "https://www.youtube.com/embed/W6NZfCO5SIk", dur: 480 },
          { title: "Variáveis e Tipos de Dados", ct: "VIDEO", url: "https://www.youtube.com/embed/edlFjlzxkSI", dur: 720 },
          { title: "Operadores e Expressões", ct: "VIDEO", url: "https://www.youtube.com/embed/Zi-Q0H4LDi0", dur: 600 },
          { title: "Material de Apoio", ct: "PDF", url: "https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Guide" },
        ]},
        { title: "Estruturas de Controle", lessons: [
          { title: "Condicionais (if/else/switch)", ct: "VIDEO", url: "https://www.youtube.com/embed/IsG4Xd6LlsM", dur: 540 },
          { title: "Loops (for/while)", ct: "VIDEO", url: "https://www.youtube.com/embed/24Wpg6njlYI", dur: 660 },
          { title: "Funções", ct: "VIDEO", url: "https://www.youtube.com/embed/qR3GqZ1m4P0", dur: 780 },
        ]},
      ],
    },
    {
      title: "React do Zero ao Avançado", category: "Front-end",
      description: "Domine o React com projetos práticos. Componentes, hooks, estado global, roteamento e APIs.",
      modules: [
        { title: "Conceitos Básicos", lessons: [
          { title: "Introdução ao React", ct: "VIDEO", url: "https://www.youtube.com/embed/N3AkSS5hXMA", dur: 600 },
          { title: "JSX e Componentes", ct: "VIDEO", url: "https://www.youtube.com/embed/9U3I4LZ5Ehk", dur: 720 },
        ]},
        { title: "Hooks e Avançado", lessons: [
          { title: "useEffect e Ciclo de Vida", ct: "VIDEO", url: "https://www.youtube.com/embed/0ik6Xz4IqW0", dur: 660 },
          { title: "Projeto Guiado - Todo App", ct: "VIDEO", url: "https://www.youtube.com/embed/DqObQNYGz5M", dur: 1500 },
        ]},
      ],
    },
    {
      title: "Python para Data Science", category: "Data Science",
      description: "Análise de dados com Python: Pandas, NumPy, Matplotlib e Seaborn.",
      modules: [
        { title: "Introdução ao Python", lessons: [
          { title: "Configuração do Ambiente", ct: "VIDEO", url: "https://www.youtube.com/embed/rfscVS0vtbw", dur: 480 },
          { title: "Python Básico", ct: "VIDEO", url: "https://www.youtube.com/embed/kqtD5dpn9C8", dur: 900 },
        ]},
      ],
    },
    {
      title: "UI/UX Design Completo", category: "Design",
      description: "Princípios de design para interfaces digitais. Wireframes, design systems e usabilidade.",
      modules: [
        { title: "Fundamentos do Design", lessons: [
          { title: "Princípios de Design", ct: "VIDEO", url: "https://www.youtube.com/embed/ZK3jMEsCn5A", dur: 600 },
          { title: "Teoria das Cores", ct: "VIDEO", url: "https://www.youtube.com/embed/_rRzO2PR5Rs", dur: 720 },
        ]},
      ],
    },
    {
      title: "Banco de Dados SQL", category: "Banco de Dados",
      description: "Modelagem relacional, consultas SQL, joins e boas práticas.",
      modules: [
        { title: "SQL Básico", lessons: [
          { title: "Introdução a Bancos Relacionais", ct: "VIDEO", url: "https://www.youtube.com/embed/7S_tz1z_5bA", dur: 540 },
          { title: "SELECT, INSERT, UPDATE, DELETE", ct: "VIDEO", url: "https://www.youtube.com/embed/bE7t8g0L4SA", dur: 780 },
        ]},
      ],
    },
    {
      title: "Node.js API RESTful", category: "Back-end",
      description: "Crie APIs profissionais com Node.js, Express e TypeScript.",
      modules: [
        { title: "Fundamentos", lessons: [
          { title: "O que é Node.js?", ct: "VIDEO", url: "https://www.youtube.com/embed/TlB_eWDSMt4", dur: 480 },
          { title: "Express Framework", ct: "VIDEO", url: "https://www.youtube.com/embed/Lr9WUkeYSA8", dur: 720 },
        ]},
      ],
    },
  ];

  const featuredCategories = new Set(["Programação", "Data Science"]);

  for (const courseData of coursesData) {
    const course = await prisma.course.create({
      data: {
        title: courseData.title, description: courseData.description, category: courseData.category,
        published: true, price: 0,
        featured: featuredCategories.has(courseData.category),
        instructorId: instructorMap[courseData.category] || lucas.id,
      },
    });

    for (let mi = 0; mi < courseData.modules.length; mi++) {
      const md = courseData.modules[mi];
      const mod = await prisma.module.create({ data: { title: md.title, orderIndex: mi + 1, courseId: course.id } });

      for (let li = 0; li < md.lessons.length; li++) {
        const ls = md.lessons[li];
        await prisma.lesson.create({
          data: { title: ls.title, contentType: ls.ct as any, contentUrl: ls.url || null, duration: ls.dur || null, orderIndex: li + 1, moduleId: mod.id },
        });
      }
    }

    const quiz = await prisma.quiz.create({
      data: { title: `Avaliação Final - ${courseData.title}`, description: "Teste seus conhecimentos. Nota mínima: 70%.", passingScore: 70, maxAttempts: 3, courseId: course.id },
    });

    const questions = [
      { text: "Qual é a saída do console.log(typeof 'Hello World')?", opts: ["number","string","boolean","object"], corr: 1 },
      { text: "O que é uma variável?", opts: ["Um valor que nunca muda","Um espaço na memória","Um tipo de função","Um operador"], corr: 1 },
      { text: "Qual comando exibe dados no console?", opts: ["print()","console.log()","echo()","write()"], corr: 1 },
      { text: "O que é um array?", opts: ["Um tipo de função","Estrutura que armazena múltiplos valores","Operador lógico","Tipo primitivo"], corr: 1 },
    ];

    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi];
      const question = await prisma.question.create({ data: { text: q.text, orderIndex: qi + 1, quizId: quiz.id } });
      for (let oi = 0; oi < q.opts.length; oi++) {
        await prisma.questionOption.create({ data: { text: q.opts[oi], isCorrect: oi === q.corr, questionId: question.id } });
      }
    }
  }

  // Enroll students
  const allCourses = await prisma.course.findMany();
  for (let ci = 0; ci < Math.min(allCourses.length, 4); ci++) {
    await prisma.enrollment.create({ data: { userId: maria.id, courseId: allCourses[ci].id, status: "ACTIVE", enrolledAt: new Date() } });
  }
  await prisma.enrollment.create({ data: { userId: joao.id, courseId: allCourses[0].id, status: "ACTIVE", enrolledAt: new Date() } });
  await prisma.enrollment.create({ data: { userId: ana.id, courseId: allCourses[2].id, status: "ACTIVE", enrolledAt: new Date() } });

  // Mark first lesson as partially watched
  const firstLesson = await prisma.lesson.findFirst({ where: { module: { courseId: allCourses[0].id } }, orderBy: { orderIndex: "asc" } });
  if (firstLesson) {
    await prisma.lessonProgress.create({ data: { userId: maria.id, lessonId: firstLesson.id, completed: false, watchedSeconds: 120, lastAccessedAt: new Date() } });
  }

  // 🎮 Seed gamification data
  await prisma.userXP.create({ data: { userId: maria.id, xp: 350, level: 2 } });
  await prisma.userXP.create({ data: { userId: joao.id, xp: 120, level: 1 } });
  await prisma.userXP.create({ data: { userId: ana.id, xp: 80, level: 1 } });

  await prisma.userStreak.create({ data: { userId: maria.id, currentStreak: 5, longestStreak: 7, lastActivityAt: new Date() } });
  await prisma.userStreak.create({ data: { userId: joao.id, currentStreak: 2, longestStreak: 3, lastActivityAt: new Date() } });

  await prisma.userBadge.create({ data: { userId: maria.id, badge: "FIRST_LESSON", title: "Primeira Aula 🎯", description: "Completou a primeira aula" } });
  await prisma.userBadge.create({ data: { userId: maria.id, badge: "STREAK_3", title: "Streak de 3 Dias 🔥", description: "Manteve streak por 3 dias" } });
  await prisma.userBadge.create({ data: { userId: joao.id, badge: "FIRST_LESSON", title: "Primeira Aula 🎯", description: "Completou a primeira aula" } });

  await prisma.achievement.create({ data: { userId: maria.id, type: "BADGE", title: "Badge: Primeira Aula! 🎯", description: "Completou a primeira aula", xpGained: 25 } });
  await prisma.achievement.create({ data: { userId: maria.id, type: "LEVEL_UP", title: "Subiu para o nível 2!", description: "Parabéns! Você alcançou o nível 2.", xpGained: 0 } });
  await prisma.achievement.create({ data: { userId: maria.id, type: "STREAK", title: "Streak de 5 dias!", description: "Manteve uma sequência de 5 dias de estudos.", xpGained: 30 } });

  // 🔔 Seed demo notifications
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@lms.com" } });
  if (adminUser) {
    await prisma.notification.createMany({
      data: [
        {
          userId: adminUser.id,
          type: "ADMIN_ALERT",
          title: "Bem-vindo ao painel Admin! 👋",
          message: "Você pode gerenciar cursos, alunos e acompanhar métricas da plataforma.",
          read: false,
        },
        {
          userId: adminUser.id,
          type: "COURSE_PUBLISHED",
          title: "Cursos carregados com sucesso",
          message: "Todos os 6 cursos iniciais foram criados e publicados no catálogo.",
          link: "/admin/cursos",
          read: false,
        },
      ],
    });
  }

  // Demo notifications for Maria
  await prisma.notification.createMany({
    data: [
      {
        userId: maria.id,
        type: "ENROLLMENT_CONFIRMED",
        title: "Matrícula confirmada! 📚",
        message: "Você foi matriculada em 4 cursos. Continue seus estudos!",
        link: `/meus-cursos`,
        read: false,
      },
      {
        userId: maria.id,
        type: "ACHIEVEMENT_EARNED",
        title: "Badge conquistada! 🏆",
        message: "Você ganhou a badge 'Streak de 3 Dias' por manter uma sequência de estudos.",
        read: false,
      },
    ],
  });

  // 🌟 Seed demo reviews
  const enrolledCourses = await prisma.course.findMany({ take: 4 });
  await prisma.review.createMany({
    data: [
      {
        userId: maria.id,
        courseId: enrolledCourses[0].id,
        rating: 5,
        comment: "Curso excelente! As explicações são muito claras e os exemplos práticos ajudam muito no aprendizado. Recomendo para iniciantes.",
      },
      {
        userId: joao.id,
        courseId: enrolledCourses[0].id,
        rating: 4,
        comment: "Muito bom! Aprendi bastante. Apenas senti falta de mais exercícios práticos ao final de cada módulo.",
      },
      {
        userId: ana.id,
        courseId: enrolledCourses[2].id,
        rating: 5,
        comment: "Material completo e didático. Finalmente entendi conceitos que tinha dificuldade antes.",
      },
      {
        userId: maria.id,
        courseId: enrolledCourses[1].id,
        rating: 4,
        comment: "Ótimo conteúdo, abordagem bem prática. As aulas sobre hooks são excelentes.",
      },
    ],
  });

  console.log(`  ✅ Reviews demo criadas`);
  console.log(`  ✅ ${coursesData.length} cursos, módulos, aulas e quizzes criados`);
  console.log(`  ✅ Matrículas realizadas`);
  console.log("\n🎉 Seed completo!");
  console.log("\n📧 Credenciais:");
  console.log("   Admin: admin@lms.com / admin123");
  console.log("   Aluno: maria@email.com / 123456");
  console.log("   Aluno: joao@email.com / 123456");
  console.log("   Aluno: ana@email.com / 123456");
}

main().catch((e) => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
