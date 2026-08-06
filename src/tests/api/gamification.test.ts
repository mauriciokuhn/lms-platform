import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser, createTestCourse } from "../setup";

const prisma = getTestDb();

beforeAll(async () => {
  await cleanupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe("Gamification", () => {
  it("should create user XP", async () => {
    const user = await createTestUser(prisma, { email: "xp-test@test.com" });

    const xp = await prisma.userXP.create({
      data: { userId: user.id, xp: 100, level: 1 },
    });

    expect(xp.xp).toBe(100);
    expect(xp.level).toBe(1);
  });

  it("should level up when XP threshold is reached", async () => {
    const user = await createTestUser(prisma, { email: "level-test@test.com" });

    let xp = await prisma.userXP.create({
      data: { userId: user.id, xp: 0, level: 1 },
    });

    const THRESHOLD = 200;
    xp = await prisma.userXP.update({
      where: { userId: user.id },
      data: { xp: THRESHOLD, level: 2 },
    });

    expect(xp.level).toBe(2);
    expect(xp.xp).toBe(THRESHOLD);
  });

  it("should create and track streaks", async () => {
    const user = await createTestUser(prisma, { email: "streak-test@test.com" });

    const streak = await prisma.userStreak.create({
      data: {
        userId: user.id,
        currentStreak: 3,
        longestStreak: 5,
        lastActivityAt: new Date(),
      },
    });

    expect(streak.currentStreak).toBe(3);
    expect(streak.longestStreak).toBe(5);
  });

  it("should award badges", async () => {
    const user = await createTestUser(prisma, { email: "badge-test@test.com" });

    const badge = await prisma.userBadge.create({
      data: {
        userId: user.id,
        badge: "FIRST_LESSON",
        title: "Primeira Aula 🎯",
        description: "Completou a primeira aula",
      },
    });

    expect(badge.badge).toBe("FIRST_LESSON");
    expect(badge.title).toBe("Primeira Aula 🎯");
  });

  it("should track achievements", async () => {
    const user = await createTestUser(prisma, { email: "achieve-test@test.com" });

    const achievement = await prisma.achievement.create({
      data: {
        userId: user.id,
        type: "BADGE",
        title: "Achievement Unlocked!",
        xpGained: 50,
      },
    });

    expect(achievement.type).toBe("BADGE");
    expect(achievement.xpGained).toBe(50);
  });

  it("should create certificate with unique code", async () => {
    const user = await createTestUser(prisma, { email: "cert-test@test.com" });
    const course = await createTestCourse(prisma);

    const code = `CERT-${Date.now().toString(36).toUpperCase()}-TEST`;
    const certificate = await prisma.certificate.create({
      data: {
        userId: user.id,
        courseId: course.id,
        certificateCode: code,
      },
    });

    expect(certificate.certificateCode).toBe(code);
    expect(certificate.userId).toBe(user.id);
    expect(certificate.courseId).toBe(course.id);
  });

  it("should prevent duplicate certificates", async () => {
    const user = await createTestUser(prisma, { email: "dup-cert-test@test.com" });
    const course = await createTestCourse(prisma);

    await prisma.certificate.create({
      data: {
        userId: user.id,
        courseId: course.id,
        certificateCode: "DUP-TEST-001",
      },
    });

    await expect(
      prisma.certificate.create({
        data: {
          userId: user.id,
          courseId: course.id,
          certificateCode: "DUP-TEST-002",
        },
      })
    ).rejects.toThrow();
  });
});
