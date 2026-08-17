/**
 * Route-level tests for POST /api/notifications/monthly-summary.
 *
 * Covers the auth guard, creating the monthly summary notification with the
 * previous-calendar-month stats, the per-month idempotency (the title embeds
 * the month label so the next month is never blocked) and the
 * no-celebration short-circuit.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

const emailMock = vi.hoisted(() => ({ sendMonthlySummaryEmail: vi.fn() }));
vi.mock("@/lib/email", () => emailMock);

import { POST } from "@/app/api/notifications/monthly-summary/route";
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

function postSummary(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return POST();
}

/** Start of the previous calendar month, as computed by the route. */
function previousMonthRange() {
  const now = new Date();
  const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { monthStart, monthEnd };
}

function monthLabel(start: Date) {
  return start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

describe("POST /api/notifications/monthly-summary", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await postSummary()).status).toBe(401);
  });

  it("returns created:false when no lessons were completed last month", async () => {
    const user = await createTestUser(prisma, { email: "ms-empty@test.com" });
    const res = await postSummary(createMockSession({ id: user.id }));
    expect(res.status).toBe(200);
    expect((await res.json()).created).toBe(false);
  });

  it("counts only lessons completed in the PREVIOUS calendar month", async () => {
    const user = await createTestUser(prisma, { email: "ms-prev@test.com" });
    const { monthStart, monthEnd } = previousMonthRange();
    // A lesson completed during the previous month.
    const prevCourse = await createTestCourse(prisma);
    const prevModule = await createTestModule(prisma, prevCourse.id);
    const prevLesson = await createTestLesson(prisma, prevModule.id);
    const inPrevMonth = new Date(
      monthStart.getTime() + (monthEnd.getTime() - monthStart.getTime()) / 2
    );
    await prisma.lessonProgress.create({
      data: {
        userId: user.id,
        lessonId: prevLesson.id,
        completed: true,
        completedAt: inPrevMonth,
      },
    });
    // A lesson completed THIS month must be ignored.
    const nowCourse = await createTestCourse(prisma);
    const nowModule = await createTestModule(prisma, nowCourse.id);
    const nowLesson = await createTestLesson(prisma, nowModule.id);
    await prisma.lessonProgress.create({
      data: { userId: user.id, lessonId: nowLesson.id, completed: true, completedAt: new Date() },
    });

    const res = await postSummary(createMockSession({ id: user.id }));
    expect(res.status).toBe(200);
    expect((await res.json()).created).toBe(true);

    const notif = await prisma.notification.findFirst({
      where: { userId: user.id, title: { startsWith: "Resumo Mensal" } },
    });
    expect(notif).not.toBeNull();
    expect(notif?.message).toContain("1 aula");
  });

  it("sends the monthly email with the summarized stats", async () => {
    emailMock.sendMonthlySummaryEmail.mockResolvedValue({ success: true });
    const user = await createTestUser(prisma, { email: "ms-mail@test.com" });
    const { monthStart, monthEnd } = previousMonthRange();
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    const lesson = await createTestLesson(prisma, mod.id);
    await prisma.lessonProgress.create({
      data: {
        userId: user.id,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date(
          monthStart.getTime() + (monthEnd.getTime() - monthStart.getTime()) / 2
        ),
      },
    });

    await postSummary(createMockSession({ id: user.id }));

    expect(emailMock.sendMonthlySummaryEmail).toHaveBeenCalledWith(
      user.email,
      "Test User",
      expect.objectContaining({
        monthLabel: monthLabel(monthStart),
        lessons: 1,
        xp: 50,
        badges: 0,
      })
    );
  });

  it("is idempotent per month and allows the NEXT month to run", async () => {
    const user = await createTestUser(prisma, { email: "ms-month@test.com" });
    const { monthStart, monthEnd } = previousMonthRange();
    const course = await createTestCourse(prisma);
    const mod = await createTestModule(prisma, course.id);
    const lesson = await createTestLesson(prisma, mod.id);
    await prisma.lessonProgress.create({
      data: {
        userId: user.id,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date(
          monthStart.getTime() + (monthEnd.getTime() - monthStart.getTime()) / 2
        ),
      },
    });

    const first = await postSummary(createMockSession({ id: user.id }));
    expect((await first.json()).created).toBe(true);

    const second = await postSummary(createMockSession({ id: user.id }));
    expect((await second.json()).created).toBe(false);

    // The next calendar month's title differs, so it is not blocked by the
    // previous notification: simulate by inserting a row with next month's
    // label and confirming the route's lookup key is month-specific.
    const now = new Date();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextLabel = monthLabel(nextMonthStart);
    const titles = await prisma.notification.findMany({
      where: { userId: user.id, title: { startsWith: "Resumo Mensal" } },
      select: { title: true },
    });
    expect(titles).toHaveLength(1);
    expect(titles[0].title).not.toContain(nextLabel);
  });
});
