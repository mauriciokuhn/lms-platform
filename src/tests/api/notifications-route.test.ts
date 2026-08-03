/**
 * Route-level tests for GET/PATCH /api/notifications.
 *
 * Exercises the real handlers: 401 guard, list + unread count,
 * marking a single notification as read (with ownership 404), and
 * marking all as read.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

// ── Mocks (hoisted BEFORE the route is imported) ────────────────────────
const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import { GET, PATCH } from "@/app/api/notifications/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

function getNotifications(session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return GET();
}

function patchNotifications(body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request("http://localhost/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(req);
}

describe("Notifications route", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    expect((await getNotifications()).status).toBe(401);
    expect((await patchNotifications({ all: true })).status).toBe(401);
  });

  it("returns an empty list with zero unread for a fresh user", async () => {
    const user = await createTestUser(prisma, { email: "n-empty@test.com" });
    const res = await getNotifications(createMockSession({ id: user.id }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.notifications).toEqual([]);
    expect(data.unreadCount).toBe(0);
  });

  it("lists notifications and counts only unread ones", async () => {
    const user = await createTestUser(prisma, { email: "n-list@test.com" });
    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: "XP_GAINED", title: "+50 XP", message: "Ganhou 50 XP" },
        { userId: user.id, type: "XP_GAINED", title: "+20 XP", message: "Ganhou 20 XP" },
        { userId: user.id, type: "ADMIN_ALERT", title: "Aviso", message: "Manutenção", read: true },
      ],
    });

    const res = await getNotifications(createMockSession({ id: user.id }));
    const data = await res.json();
    expect(data.unreadCount).toBe(2);
    expect(data.notifications).toHaveLength(3);
    // createMany stamps the same createdAt timestamp, so order is not
    // deterministic — assert presence of every title instead of index 0.
    const titles = data.notifications.map((n: { title: string }) => n.title);
    expect(titles).toEqual(expect.arrayContaining(["+50 XP", "+20 XP", "Aviso"]));
  });

  it("marks a single notification as read", async () => {
    const user = await createTestUser(prisma, { email: "n-one@test.com" });
    const n1 = await prisma.notification.create({
      data: { userId: user.id, type: "ENROLLMENT_CONFIRMED", title: "Matrícula", message: "Bem-vindo!" },
    });
    await prisma.notification.create({
      data: { userId: user.id, type: "ENROLLMENT_CONFIRMED", title: "Matrícula 2", message: "Outro aviso" },
    });

    const res = await patchNotifications({ id: n1.id }, createMockSession({ id: user.id }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const dbN1 = await prisma.notification.findUnique({ where: { id: n1.id } });
    expect(dbN1?.read).toBe(true);
    const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });
    expect(unread).toBe(1);
  });

  it("returns 404 when marking another user's notification as read", async () => {
    const owner = await createTestUser(prisma, { email: "n-owner@test.com" });
    const other = await createTestUser(prisma, { email: "n-other@test.com" });
    const notif = await prisma.notification.create({
      data: { userId: owner.id, type: "CERTIFICATE_ISSUED", title: "Certificado", message: "Emitido" },
    });

    const res = await patchNotifications({ id: notif.id }, createMockSession({ id: other.id }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain("não encontrada");
  });

  it("marks all notifications as read with all:true", async () => {
    const user = await createTestUser(prisma, { email: "n-all@test.com" });
    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: "ACHIEVEMENT_EARNED", title: "Badge", message: "Novo badge!" },
        { userId: user.id, type: "ACHIEVEMENT_EARNED", title: "Badge 2", message: "Mais um badge" },
      ],
    });

    const res = await patchNotifications({ all: true }, createMockSession({ id: user.id }));
    expect(res.status).toBe(200);

    const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });
    expect(unread).toBe(0);
  });
});
