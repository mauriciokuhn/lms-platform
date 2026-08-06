/**
 * Unit tests for the Prisma client singleton (src/lib/db.ts).
 *
 * The generated PrismaClient is mocked so no real database is touched.
 * Verifies:
 *  - SQLite URL resolution: an absolute `file:` URL pointing at
 *    <cwd>/prisma/dev.db when DATABASE_URL is unset or starts with file:
 *  - Plain `new PrismaClient()` when DATABASE_URL points at a server DB
 *  - Global singleton reuse outside production (NODE_ENV != "production")
 *  - No global caching when NODE_ENV === "production"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ctorCalls = vi.hoisted(() => [] as unknown[][]);

vi.mock("../../generated/prisma/client", () => ({
  PrismaClient: vi.fn((...args: unknown[]) => {
    ctorCalls.push(args);
    return { __dbMock: true };
  }),
}));

describe("db client creation", () => {
  beforeEach(() => {
    ctorCalls.length = 0;
    delete process.env.DATABASE_URL;
    // Simulate a fresh process: clear the cached global singleton.
    (globalThis as { prisma?: unknown }).prisma = undefined;
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
    vi.unstubAllEnvs();
  });

  it("uses an absolute file: URL for SQLite when DATABASE_URL is unset", async () => {
    vi.resetModules();
    await import("../../lib/db");

    const args = ctorCalls.at(-1);
    expect(args).toHaveLength(1);
    const opts = args?.[0] as { datasources?: { db?: { url?: string } } };
    const url = opts?.datasources?.db?.url ?? "";
    expect(url).toMatch(/^file:.+prisma\/dev\.db$/);
    // Prisma on Windows rejects the RFC triple-slash form — never emit it.
    expect(url).not.toContain("file:///");
    expect(url.startsWith("file:")).toBe(true);
  });

  it("resolves SQLite to the absolute path even when DATABASE_URL is a file: URL", async () => {
    process.env.DATABASE_URL = "file:./dev.db";
    vi.resetModules();
    await import("../../lib/db");

    const args = ctorCalls.at(-1);
    const opts = args?.[0] as { datasources?: { db?: { url?: string } } };
    expect(opts?.datasources?.db?.url).toMatch(/^file:.+prisma\/dev\.db$/);
  });

  it("instantiates PrismaClient without datasources override for a server URL", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/lms";
    vi.resetModules();
    await import("../../lib/db");

    // new PrismaClient() with zero arguments.
    expect(ctorCalls.at(-1)).toEqual([]);
  });

  it("instantiates PrismaClient without datasources override for a mysql URL", async () => {
    process.env.DATABASE_URL = "mysql://user:pass@localhost:3306/lms";
    vi.resetModules();
    await import("../../lib/db");

    expect(ctorCalls.at(-1)).toEqual([]);
  });

  it("reuses the same singleton when imported again outside production", async () => {
    vi.resetModules();
    const { db: first } = await import("../../lib/db");
    const callsAfterFirst = ctorCalls.length;

    vi.resetModules();
    const { db: second } = await import("../../lib/db");

    expect(ctorCalls.length).toBe(callsAfterFirst);
    expect(second).toBe(first);
  });

  it("does not cache globally when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { db: first } = await import("../../lib/db");

    vi.resetModules();
    const { db: second } = await import("../../lib/db");

    expect(ctorCalls).toHaveLength(2);
    expect(second).not.toBe(first);
  });
});
