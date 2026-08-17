/**
 * Route-level tests for GET/POST /api/progress/streak-alert.
 *
 * Covers the auth guard, the "at risk" computation (last activity yesterday
 * + nothing completed today), the safe states (already broken, activity
 * today, no streak), the 24h idempotency of the POST notification and the
 * email/push fan-out calls.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

const emailMock = vi.hoisted(() => ({ sendStreakAtRiskEmail: vi.fn() }));
vi.mock("@/lib/email", () => emailMock);

const pushMock = vi.hoisted(() => ({ notifyUserPush: vi.fn() }));
vi.mock("@/lib/push-notifications", () => pushMock);

import { GET, POST } from "@/app/api/progress/streak-alert/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createTestCourse,
  createTestModule,
  createTestLesson,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

const DAY_MS = 1000 * 60 * 60 * 24;

function yesterday() {
  return new Date(Date.now() - DAY_MS);
}

async function setStreak(userId: string, days: number, lastActivityAt: Date) {
  return prisma.userStreak.upsert({
    where: { userId },
    create: { userId, currentStreak: days, longestStreak: days, lastActivityAt },
    update: { currentStreak: days, lastActivityAt },
  });
}

async function completeLessonNow(userId: string) {
  const course = await createTestCourse(prisma);
  const mod = await createTestModule(prisma, course.id);
  const lesson = await createTestLesson(prisma, mod.id);
  await prisma.lessonProgress.create({
    data: { userId, lessonId: lesson.id, completed: true, completedAt: new Date() },
  });
}

function getStatus(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return GET();
}

function postAlert(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return POST();
}

describe("Streak alert route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    emailMock.sendStreakAtRiskEmail.mockReset();
    pushMock.notifyUserPush.mockReset();
    pushMock.notifyUserPush.mockResolvedValue({ success: true, delivered: 0, total: 0, simulated: false });
    emailMock.sendStreakAtRiskEmail.mockResolvedValue({ success: true });
  });

  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      expect((await getStatus()).status).toBe(401);
      expect((await postAlert()).status).toBe(401);
    });

    it("reports at risk when last activity was yesterday and nothing today", async () => {
      const user = await createTestUser(prisma, { email: "sa-risk@test.com" });
      await setStreak(user.id, 5, yesterday());

      const res = await getStatus(createMockSession({ id: user.id }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.atRisk).toBe(true);
      expect(data.streak).toBe(5);
    });

    it("reports NOT at risk when a lesson was completed today", async () => {
      const user = await createTestUser(prisma, { email: "sa-safe@test.com" });
      await setStreak(user.id, 5, yesterday());
      await completeLessonNow(user.id);

      const res = await getStatus(createMockSession({ id: user.id }));
      const data = await res.json();
      expect(data.atRisk).toBe(false);
    });

    it("reports NOT at risk when there is no active streak", async () => {
      const user = await createTestUser(prisma, { email: "sa-nostreak@test.com" });
      await setStreak(user.id, 0, yesterday());

      const res = await getStatus(createMockSession({ id: user.id }));
      const data = await res.json();
      expect(data.atRisk).toBe(false);
      expect(data.streak).toBe(0);
    });

    it("reports NOT at risk when the streak was already broken 2+ days ago", async () => {
      const user = await createTestUser(prisma, { email: "sa-broken@test.com" });
      await setStreak(user.id, 3, new Date(Date.now() - 2 * DAY_MS));

      const res = await getStatus(createMockSession({ id: user.id }));
      const data = await res.json();
      expect(data.atRisk).toBe(false);
    });
  });

  describe("POST", () => {
    it("creates the notification, email and push when at risk", async () => {
      const user = await createTestUser(prisma, { email: "sa-post@test.com" });
      await setStreak(user.id, 5, yesterday());

      const res = await postAlert(createMockSession({ id: user.id }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.notified).toBe(true);
      expect(data.atRisk).toBe(true);

      const notif = await prisma.notification.findFirst({
        where: { userId: user.id, title: { startsWith: "Streak em risco" } },
      });
      expect(notif).not.toBeNull();
      expect(notif?.message).toContain("5 dias");

      expect(emailMock.sendStreakAtRiskEmail).toHaveBeenCalledWith(user.email, "Test User", 5);
      expect(pushMock.notifyUserPush).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({ tag: "streak-risk", title: "Streak em risco! 🔥" })
      );
    });

    it("is idempotent within the same 24h window", async () => {
      const user = await createTestUser(prisma, { email: "sa-dup@test.com" });
      await setStreak(user.id, 3, yesterday());

      const first = await postAlert(createMockSession({ id: user.id }));
      expect((await first.json()).notified).toBe(true);

      const second = await postAlert(createMockSession({ id: user.id }));
      expect((await second.json()).notified).toBe(false);

      const count = await prisma.notification.count({
        where: { userId: user.id, title: { startsWith: "Streak em risco" } },
      });
      expect(count).toBe(1);
      // Email/push fired only once.
      expect(emailMock.sendStreakAtRiskEmail).toHaveBeenCalledTimes(1);
      expect(pushMock.notifyUserPush).toHaveBeenCalledTimes(1);
    });

    it("does nothing when the streak is not at risk", async () => {
      const user = await createTestUser(prisma, { email: "sa-noop@test.com" });
      await setStreak(user.id, 5, yesterday());
      await completeLessonNow(user.id);

      const res = await postAlert(createMockSession({ id: user.id }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.notified).toBe(false);
      expect(data.atRisk).toBe(false);

      expect(emailMock.sendStreakAtRiskEmail).not.toHaveBeenCalled();
      expect(pushMock.notifyUserPush).not.toHaveBeenCalled();
    });
  });
});
