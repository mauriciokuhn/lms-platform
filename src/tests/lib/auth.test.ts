/**
 * Unit tests for src/lib/auth.ts (NextAuth configuration).
 *
 * `next-auth` is mocked to capture the config object so the actual
 * `authorize`, `jwt` and `session` callbacks can be exercised in isolation.
 * The database (via @/lib/db) and bcrypt are mocked — no real DB/network.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocks (hoisted BEFORE importing the module under test) ──────────────
const findUniqueMock = vi.hoisted(() => vi.fn());
const bcryptCompareMock = vi.hoisted(() => vi.fn());

const captured = vi.hoisted(() => ({ config: null as Record<string, unknown> | null }));

vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    captured.config = config as Record<string, unknown>;
    return {
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    };
  },
}));

vi.mock("next-auth/providers/credentials", () => ({
  // Spread the config so the real `authorize` fn defined in auth.ts is
  // attached to the returned provider object (that's what NextAuth does).
  default: (config: Record<string, unknown>) => ({
    id: "credentials",
    name: "credentials",
    ...config,
  }),
}));

vi.mock("next-auth/providers/google", () => ({
  default: () => ({ id: "google" }),
}));

vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: findUniqueMock } },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: bcryptCompareMock, hash: vi.fn() },
}));

// Import AFTER all mocks are registered.
import { signIn, signOut, auth, handlers } from "@/lib/auth";

function getCredentialsProvider() {
  const providers = (captured.config?.providers as Array<{ id: string; authorize?: (c: unknown) => unknown }>) || [];
  return providers.find((p) => p.id === "credentials");
}

function getCallback(name: "jwt" | "session") {
  const callbacks = (captured.config?.callbacks || {}) as Record<string, unknown>;
  return callbacks[name] as (args: Record<string, unknown>) => unknown;
}

describe("auth.ts — NextAuth configuration", () => {
  beforeEach(() => {
    // NOTE: captured.config is set once at module load (NextAuth(config)
    // runs at import time) and is intentionally NOT reset here.
    findUniqueMock.mockReset();
    bcryptCompareMock.mockReset();
  });

  it("builds handlers, signIn, signOut and auth exports", () => {
    expect(handlers).toBeDefined();
    expect(signIn).toBeDefined();
    expect(signOut).toBeDefined();
    expect(auth).toBeDefined();
    expect(captured.config).not.toBeNull();
  });

  it("configures providers, JWT strategy and sign-in page", () => {
    expect((captured.config?.providers as unknown[]).length).toBeGreaterThanOrEqual(2);
    expect(captured.config?.session).toEqual({ strategy: "jwt" });
    expect(captured.config?.pages).toMatchObject({ signIn: "/login" });
  });

  // ── authorize ─────────────────────────────────────────────────────────

  it("authorize returns the user for valid credentials", async () => {
    const user = { id: "u1", email: "admin@lms.com", name: "Admin", passwordHash: "hash", role: "ADMIN", plan: "ENTERPRISE" };
    findUniqueMock.mockResolvedValue(user);
    bcryptCompareMock.mockResolvedValue(true);

    const provider = getCredentialsProvider();
    const result = await provider!.authorize!({ email: "admin@lms.com", password: "admin123" });

    expect(findUniqueMock).toHaveBeenCalledWith({ where: { email: "admin@lms.com" } });
    expect(bcryptCompareMock).toHaveBeenCalledWith("admin123", "hash");
    expect(result).toMatchObject({
      id: "u1",
      email: "admin@lms.com",
      name: "Admin",
      role: "ADMIN",
      plan: "ENTERPRISE",
    });
  });

  it("authorize returns null for an invalid email format", async () => {
    const provider = getCredentialsProvider();
    const result = await provider!.authorize!({ email: "not-an-email", password: "123456" });
    expect(result).toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("authorize returns null when the user does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);
    const provider = getCredentialsProvider();
    const result = await provider!.authorize!({ email: "ghost@lms.com", password: "admin123" });
    expect(result).toBeNull();
  });

  it("authorize returns null for a wrong password", async () => {
    findUniqueMock.mockResolvedValue({ id: "u1", email: "a@lms.com", passwordHash: "hash", role: "STUDENT" });
    bcryptCompareMock.mockResolvedValue(false);
    const provider = getCredentialsProvider();
    const result = await provider!.authorize!({ email: "a@lms.com", password: "wrongpass" });
    expect(result).toBeNull();
  });

  it("authorize returns null for an OAuth account without passwordHash", async () => {
    findUniqueMock.mockResolvedValue({ id: "u2", email: "oauth@lms.com", passwordHash: null, role: "STUDENT" });
    const provider = getCredentialsProvider();
    const result = await provider!.authorize!({ email: "oauth@lms.com", password: "123456" });
    expect(result).toBeNull();
    expect(bcryptCompareMock).not.toHaveBeenCalled();
  });

  // ── jwt callback ──────────────────────────────────────────────────────

  it("jwt adds id, role, plan and isDemo when a user signs in", async () => {
    const jwt = getCallback("jwt") as (args: { token: Record<string, unknown>; user?: Record<string, unknown> }) => Promise<unknown>;
    const result = (await jwt({
      token: {},
      user: { id: "u1", role: "INSTRUCTOR", plan: "PRO", email: "carla@lms.com" },
    })) as Record<string, unknown>;

    expect(result.id).toBe("u1");
    expect(result.role).toBe("INSTRUCTOR");
    expect(result.plan).toBe("PRO");
    expect(result.isDemo).toBe(false);
  });

  it("jwt marks demo accounts (demo@lms.com)", async () => {
    const jwt = getCallback("jwt") as (args: { token: Record<string, unknown>; user?: Record<string, unknown> }) => Promise<unknown>;
    const result = (await jwt({
      token: {},
      user: { id: "d1", role: "STUDENT", plan: "FREE", email: "demo@lms.com" },
    })) as Record<string, unknown>;

    expect(result.isDemo).toBe(true);
  });

  it("jwt keeps the token unchanged when there is no user (subsequent calls)", async () => {
    const jwt = getCallback("jwt") as (args: { token: Record<string, unknown>; user?: Record<string, unknown> }) => Promise<unknown>;
    const result = await jwt({ token: { id: "u1", role: "STUDENT" } });
    expect(result).toEqual({ id: "u1", role: "STUDENT" });
  });

  // ── session callback ──────────────────────────────────────────────────

  it("session copies id, role, plan and isDemo from the token", async () => {
    const sessionCb = getCallback("session") as (args: {
      session: { user: Record<string, unknown> };
      token: Record<string, unknown>;
    }) => Promise<unknown>;
    const result = (await sessionCb({
      session: { user: {} },
      token: { id: "u1", role: "ADMIN", plan: "ENTERPRISE", isDemo: false },
    })) as { user: Record<string, unknown> };

    expect(result.user.id).toBe("u1");
    expect(result.user.role).toBe("ADMIN");
    expect(result.user.plan).toBe("ENTERPRISE");
    expect(result.user.isDemo).toBe(false);
  });
});
