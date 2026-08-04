#!/usr/bin/env tsx
/**
 * env-check — validates the local `.env` against `.env.example`.
 *
 * Run:  npm run env:check        (or: npx tsx scripts/env-check.ts)
 *
 * Checks:
 *   1. `.env` exists (hints to copy `.env.example` when missing)
 *   2. Required vars (DATABASE_URL, AUTH_SECRET) are set and non-empty
 *   3. No unchanged placeholders are in use (e.g. "change-me-…")
 *   4. No extra vars in `.env` that are not documented in `.env.example`
 *   5. Recommended vars (AUTH_URL, NEXT_PUBLIC_APP_URL) — warning only
 *
 * Exit code: 1 on errors (e.g. missing required vars), 0 otherwise — safe
 * to run in CI as a pre-flight gate.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

const REQUIRED_VARS = ["DATABASE_URL", "AUTH_SECRET"];
const RECOMMENDED_VARS = ["AUTH_URL", "NEXT_PUBLIC_APP_URL"];

// Values that look like untouched template placeholders.
const PLACEHOLDER_RE = /change[-_]?me|changeme|your[-_]?|replace|example|xxx|todo/i;

// ─── Colors ──────────────────────────────
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GRAY = "\x1b[90m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// ─── Parsing ─────────────────────────────
/** Minimal .env parser (comments, blank lines, quotes, inline comments). */
function parseEnv(text: string): Map<string, string> {
  const vars = new Map<string, string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const withoutExport = line.startsWith("export ")
      ? line.slice("export ".length).trim()
      : line;
    const eq = withoutExport.indexOf("=");
    if (eq <= 0) continue;

    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();

    // Strip surrounding quotes FIRST — a quoted value may legitimately
    // contain " # " (e.g. KEY="a # b") and must not be treated as a comment.
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) {
      value = value.slice(1, -1);
    } else {
      // Unquoted: strip trailing inline comment ("KEY=value # note")
      value = value.replace(/\s+#.*$/, "").trim();
    }
    vars.set(key, value);
  }
  return vars;
}

// ─── Main ────────────────────────────────
function main(): number {
  const root = cwd();
  const examplePath = join(root, ".env.example");
  const envPath = join(root, ".env");

  console.log(`${BOLD}Environment check${RESET}\n`);

  if (!existsSync(examplePath)) {
    console.log(`  ${RED}✖${RESET} .env.example not found (${examplePath})`);
    console.log(`  ${RED}✖${RESET} This repo requires the committed template.`);
    return 1;
  }

  if (!existsSync(envPath)) {
    console.log(`  ${RED}✖${RESET} .env not found.`);
    console.log(`  ${YELLOW}→${RESET} Copy the template first:`);
    console.log(`      cp .env.example .env`);
    return 1;
  }

  const exampleVars = parseEnv(readFileSync(examplePath, "utf8"));
  const envVars = parseEnv(readFileSync(envPath, "utf8"));

  let errors = 0;
  let warnings = 0;

  // 1. Required vars
  console.log(`${GRAY}Required vars${RESET}`);
  for (const name of REQUIRED_VARS) {
    const value = envVars.get(name);
    if (!value || value.trim() === "") {
      errors++;
      console.log(`  ${RED}✖${RESET} ${name} is missing or empty`);
    } else if (PLACEHOLDER_RE.test(value)) {
      errors++;
      console.log(`  ${RED}✖${RESET} ${name} still uses a placeholder value`);
    } else {
      console.log(`  ${GREEN}✔${RESET} ${name}`);
    }
  }

  // 2. Placeholders in any other var
  console.log(`\n${GRAY}Placeholders${RESET}`);
  let placeholderFound = false;
  for (const [key, value] of envVars) {
    if (value && PLACEHOLDER_RE.test(value) && !REQUIRED_VARS.includes(key)) {
      placeholderFound = true;
      warnings++;
      console.log(`  ${YELLOW}⚠${RESET} ${key} looks like an unchanged placeholder`);
    }
  }
  if (!placeholderFound) {
    console.log(`  ${GREEN}✔${RESET} no placeholder values found`);
  }

  // 3. Extra vars not documented in .env.example
  console.log(`\n${GRAY}Documentation coverage${RESET}`);
  const extras = [...envVars.keys()].filter((k) => !exampleVars.has(k));
  if (extras.length > 0) {
    warnings++;
    for (const key of extras) {
      console.log(`  ${YELLOW}⚠${RESET} ${key} is set but not documented in .env.example`);
    }
  } else {
    console.log(`  ${GREEN}✔${RESET} no undocumented vars`);
  }

  // 4. Recommended vars
  console.log(`\n${GRAY}Recommended${RESET}`);
  for (const name of RECOMMENDED_VARS) {
    const value = envVars.get(name);
    if (!value || value.trim() === "") {
      warnings++;
      console.log(`  ${YELLOW}⚠${RESET} ${name} not set (auth redirects may break)`);
    } else {
      console.log(`  ${GREEN}✔${RESET} ${name}`);
    }
  }

  // 5. Summary of unset optionals (informational)
  const unsetOptionals = [...exampleVars.keys()].filter(
    (k) => !envVars.has(k) || envVars.get(k)!.trim() === ""
  );
  console.log(
    `\n  ${GRAY}${unsetOptionals.length} documented optional var(s) not configured` +
      ` (safe to ignore for local dev)${RESET}`
  );

  console.log(
    `\n${BOLD}Result:${RESET} ${errors > 0 ? `${RED}${errors} error(s)${RESET}` : `${GREEN}no errors${RESET}`}, ` +
      `${warnings > 0 ? `${YELLOW}${warnings} warning(s)${RESET}` : `${GREEN}no warnings${RESET}`}`
  );

  return errors > 0 ? 1 : 0;
}

process.exit(main());
