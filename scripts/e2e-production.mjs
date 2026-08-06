/**
 * E2E — Produção (lms-platform-beryl-gamma.vercel.app)
 *
 * Fluxos cobertos:
 *  1. Login dos 3 papéis (admin / instrutor / aluno) + redirect por role
 *  2. Matrícula do aluno (idempotente: 201 novo ou 409 já matriculado)
 *  3. Progresso de aula (salvar + verificar persistência)
 *
 * Uso: node scripts/e2e-production.mjs
 */
const BASE = process.env.E2E_BASE || "https://lms-platform-beryl-gamma.vercel.app";

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function parseCookies(setCookieHeaders = []) {
  return setCookieHeaders.map((h) => h.split(";")[0]).filter(Boolean).join("; ");
}

async function get(path, jar = "") {
  const res = await fetch(BASE + path, {
    headers: jar ? { cookie: jar } : {},
    redirect: "manual",
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

async function postForm(path, fields, jar = "") {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar },
    body: new URLSearchParams(fields).toString(),
    redirect: "manual",
  });
  return { res };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry em chamadas autenticadas: cold start / instância transitória pode
// responder 401/500 na primeira tentativa.
async function getWithRetry(path, jar, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    const r = await get(path, jar);
    if (r.res.status === 200) return r;
    await sleep(1500 * i);
  }
  return get(path, jar);
}

async function postJson(path, data, jar = "") {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: jar },
    body: JSON.stringify(data),
    redirect: "manual",
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

async function login(email, password) {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { accept: "application/json" } });
  const csrf = (await csrfRes.json()).csrfToken;
  let jar = parseCookies(csrfRes.headers.getSetCookie());

  const loginRes = await postForm(
    "/api/auth/callback/credentials",
    { csrfToken: csrf, email, password, callbackUrl: "/" },
    jar
  );
  jar = [jar, parseCookies(loginRes.res.headers.getSetCookie())].filter(Boolean).join("; ");

  const sess = await get("/api/auth/session", jar);
  return { jar, session: sess.body, loginStatus: loginRes.res.status, location: loginRes.res.headers.get("location") };
}

function roleLabel(user) {
  return user ? `${user.name} (${user.email}, ${user.role})` : "null";
}

async function main() {
  console.log(`\n🎯 E2E contra produção: ${BASE}\n`);

  // ────────────────────────── 1. LOGIN DOS 3 PAPÉIS ──────────────────────────
  console.log("1️⃣  LOGIN — Admin");
  const admin = await login("admin@lms.com", "admin123");
  check("Admin autenticou", admin.session?.user?.role === "ADMIN", roleLabel(admin.session?.user));
  check("Admin: sem error=Configuration", !String(admin.location || "").includes("error="));

  console.log("1️⃣  LOGIN — Instrutor");
  const inst = await login("lucas@lms.com", "instrutor123");
  check("Instrutor autenticou", inst.session?.user?.role === "INSTRUCTOR", roleLabel(inst.session?.user));

  console.log("1️⃣  LOGIN — Aluno");
  const aluno = await login("maria@email.com", "123456");
  check("Aluno autenticou", aluno.session?.user?.role === "STUDENT", roleLabel(aluno.session?.user));

  console.log("1️⃣  LOGIN — senha errada (deve falhar)");
  const wrong = await login("maria@email.com", "senha-errada");
  check("Senha errada rejeitada", !wrong.session?.user, String(wrong.location || "").slice(0, 60));

  // ────────────────────────── 2. REDIRECTS POR ROLE ──────────────────────────
  console.log("2️⃣  REDIRECTS por role");
  const [aAdmin, aDashboardAsAdmin] = await Promise.all([
    get("/admin", admin.jar),
    get("/dashboard", admin.jar),
  ]);
  check("Admin → /admin 200", aAdmin.res.status === 200, `status ${aAdmin.res.status}`);
  check(
    "Admin em /dashboard → 302 /admin",
    aDashboardAsAdmin.res.status === 302 && String(aDashboardAsAdmin.res.headers.get("location") || "").endsWith("/admin"),
    `${aDashboardAsAdmin.res.status} -> ${aDashboardAsAdmin.res.headers.get("location")}`
  );

  const [iInstrutor, iDashboard] = await Promise.all([
    get("/instrutor", inst.jar),
    get("/dashboard", inst.jar),
  ]);
  check("Instrutor → /instrutor 200", iInstrutor.res.status === 200, `status ${iInstrutor.res.status}`);
  // Intencional: instrutores PODEM acessar /dashboard (layout do instrutor linka de volta)
  check("Instrutor em /dashboard → 200 (intencional)", iDashboard.res.status === 200, `status ${iDashboard.res.status}`);

  const [sDashboard, sAdminAsStudent] = await Promise.all([
    get("/dashboard", aluno.jar),
    get("/admin", aluno.jar),
  ]);
  check("Aluno → /dashboard 200", sDashboard.res.status === 200, `status ${sDashboard.res.status}`);
  // Intencional: /admin exige role ADMIN → aluno vai para /login
  // (aí /login redireciona de volta para /dashboard por já estar logado)
  check(
    "Aluno em /admin → 302 /login (intencional)",
    sAdminAsStudent.res.status === 302 && String(sAdminAsStudent.res.headers.get("location") || "").endsWith("/login"),
    `${sAdminAsStudent.res.status} -> ${sAdminAsStudent.res.headers.get("location")}`
  );

  // ────────────────────────── 3. MATRÍCULA ──────────────────────────
  console.log("3️⃣  MATRÍCULA do aluno");
  const catalogRaw = (await get("/api/courses")).body;
  const catalog = Array.isArray(catalogRaw) ? catalogRaw : [];
  const myRaw = (await getWithRetry("/api/enrollments", aluno.jar)).body;
  const my = Array.isArray(myRaw) ? myRaw : [];
  check("Catálogo carregou (API 200)", Array.isArray(catalogRaw) && catalog.length > 0, `${catalog.length} cursos`);
  check(
    "GET /api/enrollments retornou lista",
    Array.isArray(myRaw),
    Array.isArray(myRaw) ? `${my.length} matrículas` : JSON.stringify(myRaw || null).slice(0, 60)
  );
  const enrolledIds = new Set(my.map((e) => e.course?.id));
  // Idempotente: prefere um curso não matriculado; se o aluno já está em todos,
  // usa a primeira matrícula (o POST /enroll então retorna 409 — aceitável).
  let alreadyEnrolled = false;
  let target = catalog.find((c) => c.published && !enrolledIds.has(c.id));
  if (!target) {
    const firstId = my[0]?.course?.id;
    target = catalog.find((c) => c.id === firstId) || catalog.find((c) => c.published);
    alreadyEnrolled = true;
  }

  if (target) {
    console.log(`    Curso alvo: "${target.title}" (${alreadyEnrolled ? "já matriculado" : "não matriculado"})`);
    const { res, body } = await postJson(`/api/courses/${target.id}/enroll`, {}, aluno.jar);
    const enrolledNow = res.status === 201 || res.status === 409; // 201 novo, 409 já matriculado
    check("POST /enroll → 201 (ou 409 se já)", enrolledNow, `status ${res.status}`);
    check(
      "Matrícula confirmada",
      res.status === 201 ? !!body?.course?.title : res.status === 409,
      res.status === 201 ? body?.course?.title || "" : "aluno já matriculado (ok)"
    );

    // ────────────────────────── 4. PROGRESSO DE AULA ──────────────────────────
    console.log("4️⃣  PROGRESSO de aula");
    const courseDetail = (await get(`/api/courses/${target.id}`, aluno.jar)).body;
    const lessons = Array.isArray(courseDetail?.modules)
      ? courseDetail.modules.flatMap((m) => (Array.isArray(m?.lessons) ? m.lessons : []))
      : [];
    check("Curso tem aulas carregadas", lessons.length > 0, `${lessons.length} aulas`);
    if (lessons.length > 0) {
      const lesson = lessons[0];
      const { res: progRes, body: progBody } = await postJson(
        `/api/lessons/${lesson.id}/progress`,
        { watchedSeconds: 300, completed: true },
        aluno.jar
      );
      check("POST /progress → 200", progRes.status === 200, `status ${progRes.status}`);
      check(
        "Progresso salvo (completed=true)",
        progBody?.completed === true && (progBody?.watchedSeconds ?? 0) >= 300,
        `watched ${progBody?.watchedSeconds}s, completed ${progBody?.completed}`
      );

      const persisted = (await get(`/api/lessons/${lesson.id}/progress`, aluno.jar)).body;
      check(
        "GET /progress confirma persistência",
        persisted?.completed === true,
        `completed ${persisted?.completed}, watched ${persisted?.watchedSeconds}s`
      );

      // Verificação final: matrícula aparece com progresso
      const afterRaw = (await getWithRetry("/api/enrollments", aluno.jar)).body;
      const after = Array.isArray(afterRaw) ? afterRaw : [];
      const mine = after.find((e) => e.course?.id === target.id);
      check(
        "Matrícula listada com progresso",
        !!mine && mine.progress?.total > 0,
        mine ? `${mine.course?.title} — ${mine.progress?.completed ?? 0}/${mine.progress?.total ?? 0} aulas (${mine.progress?.percentage ?? 0}%)` : "não encontrada"
      );
      check(
        "Progresso refletido no painel (≥1 aula concluída)",
        (mine?.progress?.completed ?? 0) >= 1 && (mine?.progress?.percentage ?? 0) > 0,
        `completed ${mine?.progress?.completed ?? "?"} / total ${mine?.progress?.total ?? "?"} (${mine?.progress?.percentage ?? 0}%)`
      );
    }
  } else {
    check("Curso alvo encontrado", false, "nenhum curso publicado disponível");
  }

  // ────────────────────────── RESUMO ──────────────────────────
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`RESULTADO: ${passed} ✅ | ${failed} ❌`);
  if (failures.length) {
    console.log("Falhas:", failures.join("; "));
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("E2E crashed:", e);
  process.exit(1);
});
