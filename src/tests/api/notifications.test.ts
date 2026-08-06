import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser } from "../setup";

const prisma = getTestDb();

beforeAll(async () => {
  await cleanupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe("Notifications", () => {
  it("should create a notification for a user", async () => {
    const user = await createTestUser(prisma, { email: "notif-create@test.com" });

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: "LESSON_COMPLETED",
        title: "Aula concluída ✅",
        message: "Você concluiu a aula 1.",
        link: "/cursos/abc",
      },
    });

    expect(notification.read).toBe(false);
    expect(notification.type).toBe("LESSON_COMPLETED");
    expect(notification.link).toBe("/cursos/abc");
    expect(notification.userId).toBe(user.id);
  });

  it("should count only unread notifications", async () => {
    const user = await createTestUser(prisma, { email: "notif-count@test.com" });

    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: "XP_GAINED", title: "+50 XP", message: "Você ganhou 50 XP" },
        { userId: user.id, type: "XP_GAINED", title: "+20 XP", message: "Você ganhou 20 XP" },
      ],
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "ADMIN_ALERT",
        title: "Aviso",
        message: "Manutenção programada",
        read: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });
    const total = await prisma.notification.count({ where: { userId: user.id } });

    expect(unreadCount).toBe(2);
    expect(total).toBe(3);
  });

  it("should mark a single notification as read", async () => {
    const user = await createTestUser(prisma, { email: "notif-read-one@test.com" });
    const n1 = await prisma.notification.create({
      data: { userId: user.id, type: "ENROLLMENT_CONFIRMED", title: "Matrícula", message: "Bem-vindo!" },
    });
    const n2 = await prisma.notification.create({
      data: { userId: user.id, type: "ENROLLMENT_CONFIRMED", title: "Matrícula 2", message: "Outro aviso" },
    });

    await prisma.notification.update({ where: { id: n1.id }, data: { read: true } });

    const unread = await prisma.notification.findMany({
      where: { userId: user.id, read: false },
    });
    expect(unread.map((n) => n.id)).toEqual([n2.id]);
  });

  it("should mark all notifications as read", async () => {
    const user = await createTestUser(prisma, { email: "notif-read-all@test.com" });
    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: "ACHIEVEMENT_EARNED", title: "Badge", message: "Novo badge!" },
        { userId: user.id, type: "ACHIEVEMENT_EARNED", title: "Badge 2", message: "Mais um badge" },
      ],
    });

    const result = await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });

    expect(result.count).toBe(2);

    const remaining = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });
    expect(remaining).toBe(0);
  });

  it("should scope notifications per user", async () => {
    const userA = await createTestUser(prisma, { email: "notif-scope-a@test.com" });
    const userB = await createTestUser(prisma, { email: "notif-scope-b@test.com" });

    await prisma.notification.create({
      data: {
        userId: userA.id,
        type: "CERTIFICATE_ISSUED",
        title: "Certificado emitido",
        message: "Parabéns pela conclusão!",
      },
    });

    const userBNotifications = await prisma.notification.findMany({
      where: { userId: userB.id },
    });
    expect(userBNotifications.length).toBe(0);

    const userANotifications = await prisma.notification.findMany({
      where: { userId: userA.id },
    });
    expect(userANotifications.length).toBe(1);
  });
});
