import { PrismaClient } from "../generated/prisma/client";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Resolve an absolute SQLite URL from the project root.
 *
 * The schema hardcodes the relative `file:./dev.db`, which Prisma resolves
 * against the schema directory in normal runs (tsx, tests, seed). But when
 * Next.js dev bundles the client through Turbopack, that relative path is
 * resolved against the compiled chunk dir (`.next/dev/server/chunks/`),
 * producing SQLITE_CANTOPEN ("Unable to open the database file"). Passing
 * an explicit absolute URL sidesteps the bundler resolution entirely.
 */
function resolveSqliteUrl(): string {
  // Empirically verified: Prisma SQLite on Windows accepts `file:C:/...`
  // but NOT the RFC-style `file:///C:/...` (triple slash) form, which
  // fails with SQLITE_CANTOPEN ("Unable to open the database file").
  const absolute = path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
  return `file:${absolute}`;
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  // Non-SQLite datasources (e.g. PostgreSQL in production) defer to env.
  if (url && !url.startsWith("file:")) {
    return new PrismaClient();
  }
  return new PrismaClient({
    datasources: { db: { url: resolveSqliteUrl() } },
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
