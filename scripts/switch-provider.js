#!/usr/bin/env node
/**
 * Switch the Prisma datasource provider between SQLite and PostgreSQL.
 *
 * The committed schema stays on SQLite so `npm install`, vitest and local
 * development work out of the box (the vitest suite bootstraps isolated
 * `file:./test-*.db` databases). Deployment targets run this script with
 * "postgresql" BEFORE `prisma generate` so the client and migrations target
 * the real database.
 *
 * Usage:
 *   node scripts/switch-provider.js sqlite       # force SQLite (dev default)
 *   node scripts/switch-provider.js postgresql   # force PostgreSQL (prod)
 *   node scripts/switch-provider.js              # toggle to the other provider
 *   node scripts/switch-provider.js --check      # print current provider only
 *
 * Plain Node, zero dependencies. Exit code 0 on success, 1 on failure.
 */

const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.join(__dirname, "..", "prisma", "schema.prisma");
const PROVIDERS = ["sqlite", "postgresql"];

// ──────────────────────────────────────────
// Canonical datasource block per provider.
// ──────────────────────────────────────────

function datasourceBlock(provider) {
  if (provider === "postgresql") {
    return `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;
  }
  return `datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}`;
}

// The human-readable pointer that follows the active block, so a developer
// reading the schema always knows how to switch (and which is active).
function guideComment(activeProvider) {
  const other = activeProvider === "postgresql" ? "sqlite" : "postgresql";
  const hint =
    other === "postgresql"
      ? 'switch to PostgreSQL:  node scripts/switch-provider.js postgresql\n//   (then set DATABASE_URL and run `npx prisma generate` + `npx prisma db push`)'
      : 'switch to SQLite:  node scripts/switch-provider.js sqlite';
  return `// ──────────────────────────────────────────
// Active datasource: ${activeProvider.toUpperCase()}
// ${hint}
// ──────────────────────────────────────────`;
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

function readSchema() {
  return fs.readFileSync(SCHEMA_PATH, "utf8");
}

/**
 * Find the ACTIVE provider. The active block is the first `provider = "..."`
 * occurrence NOT preceded by `//` on its line (the commented sample block
 * always follows the active one in this file layout).
 */
function currentProvider(schema) {
  const lines = schema.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*provider\s*=\s*"(sqlite|postgresql)"/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Rewrite the datasource section: keep everything up to the first
 * `datasource db {`, replace through the end of the ENUMS header comment
 * with the canonical block + guide comment + ENUMS header.
 *
 * The file's existing line endings (LF or CRLF) are detected and reused so
 * the rewritten section doesn't produce mixed-EOL git churn.
 */
function writeProvider(schema, provider) {
  // Section head: everything up to the datasource section. If a previous
  // run already wrote a guide comment ("Active datasource: ..."), start
  // replacing from there so toggling doesn't accumulate stale guides.
  const prevGuide = /\/\/[^\r\n]*\r*\n\/\/\s*Active datasource:/;
  const guideStart = prevGuide.exec(schema);
  const start = guideStart ? guideStart.index : schema.indexOf("datasource db {");
  if (start === -1) throw new Error("datasource db block not found in schema");

  // Anchor: the "ENUMS" banner comment that immediately follows the
  // datasource section. Loosely matched (any banner text then ENUMS) so
  // minor comment edits to the banner don't break the script. Tolerates
  // LF, CRLF and stray CRs in the banner line ([^\r\n]* then \r*\n).
  const enumAnchor = /\/\/[^\r\n]*\r*\n\/\/\s*ENUMS/;
  const enumMatch = enumAnchor.exec(schema);
  if (!enumMatch) throw new Error('ENUMS header comment not found in schema');

  const eol = schema.includes("\r\n") ? "\r\n" : "\n";
  const head = schema.slice(0, start).replace(/[ \t\r\n]+$/, "") + eol + eol;
  const tail = schema.slice(enumMatch.index);
  return (
    head +
    guideComment(provider).split("\n").join(eol) +
    eol +
    datasourceBlock(provider).split("\n").join(eol) +
    eol +
    eol +
    tail
  );
}

// ──────────────────────────────────────────
// CLI
// ──────────────────────────────────────────

function usage() {
  console.log("Usage: node scripts/switch-provider.js [sqlite|postgresql|--check]");
  console.log("  (no argument toggles to the other provider)");
}

function main() {
  const arg = process.argv[2];

  if (arg === "-h" || arg === "--help") {
    usage();
    return 0;
  }

  if (arg === "--check") {
    const schema = readSchema();
    const provider = currentProvider(schema);
    console.log(provider || "unknown");
    return provider ? 0 : 1;
  }

  const schema = readSchema();
  const current = currentProvider(schema);
  if (!current) {
    console.error("✘ Could not determine the active datasource provider.");
    return 1;
  }

  let target;
  if (!arg) {
    target = current === "postgresql" ? "sqlite" : "postgresql";
    console.log(`Toggle: ${current} → ${target}`);
  } else if (PROVIDERS.includes(arg)) {
    target = arg;
  } else {
    console.error(`✘ Unknown provider "${arg}". Expected: ${PROVIDERS.join(" | ")}`);
    usage();
    return 1;
  }

  if (target === current) {
    console.log(`✔ Already on ${target} — no change.`);
    return 0;
  }

  const next = writeProvider(schema, target);
  fs.writeFileSync(SCHEMA_PATH, next);
  console.log(`✔ Schema switched to ${target}: prisma/schema.prisma`);
  console.log(`  Next: npx prisma generate` + (target === "postgresql" ? " && npx prisma db push (or migrate dev)" : ""));
  return 0;
}

process.exit(main());
