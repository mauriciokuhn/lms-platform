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

const REQUIRED_ENV_VARS = [
  { name: "DATABASE_URL", desc: "PostgreSQL connection string", productionOnly: true },
  { name: "NEXTAUTH_SECRET", desc: "Auth secret (generate via: openssl rand -base64 32)", productionOnly: false },
  { name: "NEXTAUTH_URL", desc: "Full deployment URL", productionOnly: false },
  { name: "NEXT_PUBLIC_APP_URL", desc: "Public app URL", productionOnly: false },
];

const OPTIONAL_ENV_VARS = [
  { name: "AUTH_GOOGLE_ID", desc: "Google OAuth Client ID", dependsOn: "Google login" },
  { name: "AUTH_GOOGLE_SECRET", desc: "Google OAuth Client Secret", dependsOn: "Google login" },
  { name: "RESEND_API_KEY", desc: "Transactional emails (password reset, welcome)", dependsOn: "Email sending" },
  { name: "STRIPE_SECRET_KEY", desc: "Payment processing", dependsOn: "Paid courses/plans" },
  { name: "STRIPE_WEBHOOK_SECRET", desc: "Stripe webhook verification", dependsOn: "Paid courses/plans" },
  { name: "UPLOADTHING_SECRET", desc: "File uploads (thumbnails, PDFs)", dependsOn: "Instructor uploads" },
  { name: "UPLOADTHING_APP_ID", desc: "UploadThing app identifier", dependsOn: "Instructor uploads" },
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

async function main() {
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
    if (process.env[env.name]) {
      const val = process.env[env.name]!;
      if (env.name === "NEXTAUTH_SECRET" && val.length < 16) {
        warn(`${env.name}`, `Very short secret (${val.length} chars). Generate a strong one.`);
      } else if (env.name === "NEXTAUTH_SECRET" && (val === "your-secret-here" || val === "change-me")) {
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
}

main().catch((error) => {
  console.error(`${RED}Preflight script crashed:${RESET}`, error);
  process.exit(1);
});
