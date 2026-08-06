/**
 * Route-level tests for GET /api/profile.
 *
 * Exercises the real handler: 401 guard, 404 for a missing user, and the
 * assembled profile shape (user, xp, streak, badges, certificates, stats).
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { GET } from "@/app/api/profile/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createTestCourse,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

describe("Profile route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await GET()).status).toBe(401);
  });

  it("returns 404 when the session user does not exist in the DB", async () => {
    // Session references a user id that was never created
    authMock.auth.mockResolvedValue(createMockSession({ id: "ghost-user-id" }));
    expect((await GET()).status).toBe(404);
  });

  it("returns defaults for a fresh user", async () => {
    const user = await createTestUser(prisma, { email: "p-fresh@test.com" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id, email: user.email }));

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.user.id).toBe(user.id);
    expect(data.xp.current).toBe(0);
    expect(data.xp.level).toBe(1);
    expect(data.streak.current).toBe(0);
    expect(data.badges).toEqual([]);
    expect(data.certificates).toEqual([]);
    expect(data.stats).toEqual({
      coursesActive: 0,
      coursesCompleted: 0,
      lessonsCompleted: 0,
      quizzesPassed: 0,
    });
  });

  it("aggregates xp, streak, badges, certificates and stats", async () => {
    const user = await createTestUser(prisma, { email: "p-rich@test.com" });
    const course = await createTestCourse(prisma, { title: "Curso Perfil" });
    authMock.auth.mockResolvedValue(createMockSession({ id: user.id, email: user.email }));

    await prisma.userXP.create({ data: { userId: user.id, xp: 250, level: 2 } });
    await prisma.userStreak.create({ data: { userId: user.id, currentStreak: 3, longestStreak: 5, lastActivityAt: new Date() } });
    await prisma.userBadge.create({
      data: { userId: user.id, badge: "FIRST_LESSON", title: "Primeira Aula", description: "Completou a primeira aula" },
    });
    await prisma.certificate.create({
      data: { userId: user.id, courseId: course.id, certificateCode: `CERT-${Date.now()}` },
    });
    await prisma.enrollment.create({ data: { userId: user.id, courseId: course.id, status: "ACTIVE" } });

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.xp.current).toBe(250);
    expect(data.xp.level).toBe(2);
    expect(data.xp.nextLevelAt).toBe(400);
    expect(data.streak.current).toBe(3);
    expect(data.badges).toHaveLength(1);
    expect(data.badges[0].badge).toBe("FIRST_LESSON");
    expect(data.certificates).toHaveLength(1);
    expect(data.certificates[0].courseTitle).toBe("Curso Perfil");
    expect(data.certificates[0].code).toMatch(/^CERT-/);
    expect(data.stats.coursesActive).toBe(1);
  });
});
