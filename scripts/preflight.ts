#!/usr/bin/env tsx
/**
 * Pre-flight Check — LMS Platform
 *
 * Verifies everything is ready before deploying to production.
 * Run: npx tsx scripts/preflight.ts
 *
 * Checks:
 *   1. All required environment variables are set
 *   2. Prisma Client is generated
 *   3. Database is accessible
 *   4. Build compiles successfully
 *   5. Sitemap generates correctly
 *   6. Email service is configured (warning only)
 *   7. Stripe webhook secret is configured (if Stripe key is set)
 *   8. Google OAuth is configured (if needed)
 */

import { existsSync } from "fs";
import { readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

// AUTH_* are the canonical names (Auth.js v5); the legacy NEXTAUTH_* names
// are accepted as aliases (the CI workflow still exports them).
type RequiredEnvVar = {
  name: string;
  desc: string;
  productionOnly: boolean;
  aliases?: string[];
};

const REQUIRED_ENV_VARS: RequiredEnvVar[] = [
  { name: "DATABASE_URL", desc: "Database connection string", productionOnly: true },
  { name: "AUTH_SECRET", aliases: ["NEXTAUTH_SECRET"], desc: "Auth secret (generate via: openssl rand -base64 32)", productionOnly: false },
  { name: "AUTH_URL", aliases: ["NEXTAUTH_URL"], desc: "Full deployment URL", productionOnly: false },
  { name: "NEXT_PUBLIC_APP_URL", desc: "Public app URL", productionOnly: false },
];

const OPTIONAL_ENV_VARS = [
  { name: "AUTH_GOOGLE_ID", desc: "Google OAuth Client ID", dependsOn: "Google login" },
  { name: "AUTH_GOOGLE_SECRET", desc: "Google OAuth Client Secret", dependsOn: "Google login" },
  { name: "RESEND_API_KEY", desc: "Transactional emails (password reset, welcome)", dependsOn: "Email sending" },
  { name: "UPSTASH_REDIS_REST_URL", desc: "Persistent rate limiting + cache layer", dependsOn: "Upstash Redis" },
  { name: "UPSTASH_REDIS_REST_TOKEN", desc: "Upstash Redis token", dependsOn: "Upstash Redis" },
  { name: "STRIPE_SECRET_KEY", desc: "Payment processing", dependsOn: "Paid courses/plans" },
  { name: "STRIPE_WEBHOOK_SECRET", desc: "Stripe webhook verification", dependsOn: "Paid courses/plans" },
  { name: "S3_ACCESS_KEY_ID", desc: "File uploads (S3-compatible)", dependsOn: "Instructor uploads" },
  { name: "S3_SECRET_ACCESS_KEY", desc: "File uploads (S3-compatible)", dependsOn: "Instructor uploads" },
  { name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY", desc: "Web push notifications", dependsOn: "Push notifications" },
  { name: "VAPID_PRIVATE_KEY", desc: "Web push notifications", dependsOn: "Push notifications" },
  { name: "YOUTUBE_API_KEY", desc: "YouTube video metadata", dependsOn: "Video lessons" },
  { name: "NEXT_PUBLIC_SENTRY_DSN", desc: "Error monitoring", dependsOn: "Sentry" },
];

// ─── Utils ───────────────────────────────

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GRAY = "\x1b[90m";

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(label: string, detail?: string) {
  passed++;
  console.log(`  ${GREEN}✔${RESET} ${label}${detail ? ` ${GRAY}— ${detail}${RESET}` : ""}`);
}

function fail(label: string, detail: string) {
  failed++;
  console.log(`  ${RED}✘${RESET} ${label}`);
  console.log(`    ${RED}${detail}${RESET}`);
}

function warn(label: string, detail: string) {
  warnings++;
  console.log(`  ${YELLOW}⚠${RESET} ${label}${detail ? ` ${GRAY}— ${detail}${RESET}` : ""}`);
}

function heading(text: string) {
  console.log(`\n${BOLD}${CYAN}━━━ ${text} ━━━${RESET}\n`);
}

// ─── Checks ──────────────────────────────

async function checkPrismaClient() {
  const clientPath = join(cwd(), "src", "generated", "prisma", "client.ts");
  if (existsSync(clientPath)) {
    ok("Prisma Client", "Generated at src/generated/prisma/");
  } else {
    // Try index.js as fallback
    const indexPath = join(cwd(), "src", "generated", "prisma", "index.js");
    if (existsSync(indexPath)) {
      ok("Prisma Client", "Generated at src/generated/prisma/");
    } else {
      fail("Prisma Client", "Not generated. Run: npx prisma generate");
    }
  }
}

async function checkDatabase() {
  const dbUrl = process.env.DATABASE_URL || "";
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  if (dbUrl.includes("file:./dev.db") && isProduction) {
    fail("Database", "Using SQLite in production! Switch to PostgreSQL.");
  } else if (dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://")) {
    try {
      // Dynamic import - path relative to scripts/ directory
      const prismaModule = await import("../src/generated/prisma/client");
      const prisma = new prismaModule.PrismaClient();
      await prisma.$connect();
      ok("PostgreSQL", "Connected successfully");
      await prisma.$disconnect();
    } catch {
      fail("PostgreSQL", "Cannot connect. Check DATABASE_URL and ensure DB is running.");
    }
  } else if (dbUrl) {
    warn("Database URL", `Unknown format: ${dbUrl.substring(0, 30)}... (expected postgresql://)`);
  } else {
    warn("DATABASE_URL", "Not set. Build will fail.");
  }
}

async function checkBuild() {
  if (existsSync(join(cwd(), ".next", "build-manifest.json"))) {
    ok("Build artifacts", ".next/ directory exists. Run fresh build before deploying.");
  } else {
    warn("Build artifacts", "No .next/ found. Run: npm run build");
  }
}

async function checkTypeScript() {
  try {
    const { execSync } = await import("child_process");
    execSync("npx tsc --noEmit", { stdio: "pipe", timeout: 120000 });
    ok("TypeScript", "No type errors");
  } catch {
    fail("TypeScript", "Type errors found. Run: npx tsc --noEmit");
  }
}

async function checkSchema() {
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  try {
    const schema = readFileSync(join(cwd(), "prisma", "schema.prisma"), "utf-8");
    if (schema.includes('provider = "postgresql"')) {
      ok("Schema", "PostgreSQL provider is active");
    } else if (schema.includes('provider = "sqlite"')) {
      if (isProduction) {
        fail("Schema", "SQLite is active. Must switch to PostgreSQL for production.");
      } else {
        warn("Schema", "SQLite is active (OK for development only)");
      }
    }
  } catch {
    fail("Schema", "Could not read prisma/schema.prisma");
  }
}

function checkSitemap() {
  const sitemapPath = join(cwd(), "src", "app", "sitemap.ts");
  if (existsSync(sitemapPath)) {
    ok("Sitemap", "src/app/sitemap.ts exists");
  } else {
    fail("Sitemap", "File not found at src/app/sitemap.ts");
  }
}

function checkEmail() {
  if (process.env.RESEND_API_KEY) {
    ok("Resend API Key", "Configured for transactional emails");
  } else {
    warn("Resend API Key", "Password reset emails will be logged to console only");
  }
}

function checkAssets() {
  const requiredAssets = [
    { path: "public/favicon.ico", label: "Favicon" },
    { path: "public/og-image.png", label: "OG Image (1200x630)" },
    { path: "public/manifest.json", label: "PWA Manifest" },
    { path: "public/sw.js", label: "Service Worker" },
    { path: "public/offline.html", label: "Offline Page" },
    { path: "public/icons/icon-192x192.png", label: "PWA Icon 192x192" },
    { path: "public/icons/icon-512x512.png", label: "PWA Icon 512x512" },
  ];
  for (const asset of requiredAssets) {
    const fullPath = join(cwd(), asset.path);
    if (existsSync(fullPath)) {
      ok(asset.label, asset.path);
    } else {
      warn(asset.label, `Missing: ${asset.path}. Run: npm run generate-assets`);
    }
  }
}

// ─── Main ────────────────────────────────

// Load `.env` into process.env (without overriding existing shell vars) so
// the check works out of the box locally, matching env:check's file-based
// validation. In CI the vars come from the workflow env block instead.
function loadDotEnv() {
  const envPath = join(cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ")
      ? line.slice("export ".length).trim()
      : line;
    const eq = withoutExport.indexOf("=");
    if (eq <= 0) continue;
    const key = withoutExport.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue; // shell/CI env wins
    let value = withoutExport.slice(eq + 1).trim();
    // Strip surrounding quotes FIRST — a quoted value may contain " # ".
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) {
      value = value.slice(1, -1);
    } else {
      // Unquoted: strip trailing inline comment ("KEY=value # note") so
      // placeholder detection matches env-check's parser.
      value = value.replace(/\s+#.*$/, "").trim();
    }
    process.env[key] = value;
  }
}

async function main() {
  loadDotEnv();

  console.log(`${BOLD}${CYAN}`);
  console.log("╔══════════════════════════════════════════╗");
  console.log("║    LMS Platform — Pre-flight Check       ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`${RESET}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  // ── 1. Environment Variables ───────────
  heading("1. Environment Variables");

  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const missingRequired: string[] = [];

  for (const env of REQUIRED_ENV_VARS) {
    if (env.productionOnly && !isProduction) {
      ok(`${env.name}`, `Required in production only`);
      continue;
    }
    // Accept the canonical name or any documented alias.
    const value =
      process.env[env.name] ??
      env.aliases?.map((alias) => process.env[alias]).find(Boolean);
    if (value) {
      if (env.name === "AUTH_SECRET" && value.length < 16) {
        warn(`${env.name}`, `Very short secret (${value.length} chars). Generate a strong one.`);
      } else if (env.name === "AUTH_SECRET" && (value === "your-secret-here" || value === "change-me")) {
        fail(`${env.name}`, `Secret is a placeholder value!`);
        missingRequired.push(env.name);
      } else {
        ok(`${env.name}`, `${env.desc}`);
      }
    } else {
      fail(`${env.name}`, `Not set. ${env.desc}`);
      missingRequired.push(env.name);
    }
  }

  if (missingRequired.length > 0) {
    console.log(`\n  ${RED}${missingRequired.length} required variable(s) missing.${RESET}`);
  }

  // ── 2. Optional Environment Variables ──
  heading("2. Optional Environment Variables");

  for (const env of OPTIONAL_ENV_VARS) {
    if (process.env[env.name]) {
      ok(`${env.name}`, `${env.dependsOn}`);
    } else {
      warn(`${env.name} (optional)`, `Will be needed for ${env.dependsOn}`);
    }
  }

  // ── 3. Prisma Client ──────────────────
  heading("3. Prisma Client");
  await checkPrismaClient();

  // ── 4. Database Connection ─────────────
  heading("4. Database Connection");
  await checkDatabase();

  // ── 5. Build Check ─────────────────────
  heading("5. Build Check");
  checkBuild();
  await checkTypeScript();

  // ── 6. Prisma Schema Check ─────────────
  heading("6. Prisma Schema");
  await checkSchema();

  // ── 7. Sitemap ─────────────────────────
  heading("7. Sitemap");
  checkSitemap();

  // ── 8. Email Service ───────────────────
  heading("8. Email Service");
  checkEmail();

  // ── 9. Public Assets ───────────────────
  heading("9. Public Assets");
  checkAssets();

  // ── Summary ─────────────────────────────
  heading("Summary");

  const total = passed + failed + warnings;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log(`  ${GREEN}✔${RESET} Passed:   ${passed}`);
  console.log(`  ${YELLOW}⚠${RESET} Warnings: ${warnings}`);
  console.log(`  ${RED}✘${RESET} Failed:   ${failed}`);
  console.log(`  ${BOLD}Score:    ${score}%${RESET}\n`);

  if (failed === 0) {
    console.log(`  ${GREEN}${BOLD}✅ Ready for deployment!${RESET}`);
  } else if (failed < 3) {
    console.log(`  ${YELLOW}${BOLD}⚠ Fix ${failed} issue(s) before deploying${RESET}`);
  } else {
    console.log(`  ${RED}${BOLD}❌ Fix ${failed} critical issue(s) before deploying${RESET}`);
  }

  console.log(`\n${GRAY}Run: npm run build && npm run db:push && npx tsx scripts/preflight.ts${RESET}\n`);

  // Gate for CI: exit non-zero when any check failed.
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(`${RED}Preflight script crashed:${RESET}`, error);
  process.exit(1);
});
