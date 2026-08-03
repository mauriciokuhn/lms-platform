import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser, createTestCourse } from "../setup";
import type { PrismaClient } from "../../generated/prisma/client";

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = getTestDb();
  await cleanupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe("Courses API", () => {
  it("should create a course", async () => {
    const course = await createTestCourse(prisma, {
      title: "JavaScript Fundamentals",
      category: "Programação",
    });

    expect(course).toBeDefined();
    expect(course.title).toBe("JavaScript Fundamentals");
    expect(course.category).toBe("Programação");
    expect(course.published).toBe(true);
  });

  it("should create a course with instructor", async () => {
    const instructor = await createTestUser(prisma, {
      name: "Instrutor Teste",
      email: "instrutor@test.com",
      role: "INSTRUCTOR",
    });

    const course = await createTestCourse(prisma, {
      title: "React Avançado",
      instructorId: instructor.id,
    });

    expect(course.instructorId).toBe(instructor.id);
  });

  it("should create modules and lessons for a course", async () => {
    const course = await createTestCourse(prisma);
    const mod = await prisma.module.create({
      data: { title: "Módulo 1", orderIndex: 1, courseId: course.id },
    });
    const lesson = await prisma.lesson.create({
      data: {
        title: "Aula 1",
        contentType: "VIDEO",
        contentUrl: "https://youtube.com/embed/test",
        duration: 300,
        orderIndex: 1,
        moduleId: mod.id,
      },
    });

    expect(mod.courseId).toBe(course.id);
    expect(lesson.moduleId).toBe(mod.id);
  });

  it("should track lesson progress", async () => {
    const user = await createTestUser(prisma, { email: "progress@test.com" });
    const course = await createTestCourse(prisma);
    const mod = await prisma.module.create({
      data: { title: "Mod", orderIndex: 1, courseId: course.id },
    });
    const lesson = await prisma.lesson.create({
      data: {
        title: "Aula",
        contentType: "VIDEO",
        contentUrl: "https://youtube.com/embed/test",
        duration: 300,
        orderIndex: 1,
        moduleId: mod.id,
      },
    });

    const progress = await prisma.lessonProgress.create({
      data: {
        userId: user.id,
        lessonId: lesson.id,
        completed: true,
        watchedSeconds: 300,
      },
    });

    expect(progress.completed).toBe(true);
    expect(progress.watchedSeconds).toBe(300);
  });

  it("should enroll a user in a course", async () => {
    const user = await createTestUser(prisma, { email: "enroll@test.com" });
    const course = await createTestCourse(prisma);

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        status: "ACTIVE",
        enrolledAt: new Date(),
      },
    });

    expect(enrollment.userId).toBe(user.id);
    expect(enrollment.courseId).toBe(course.id);
    expect(enrollment.status).toBe("ACTIVE");
  });

  it("should prevent duplicate enrollment", async () => {
    const user = await createTestUser(prisma, { email: "dup@test.com" });
    const course = await createTestCourse(prisma);

    await prisma.enrollment.create({
      data: { userId: user.id, courseId: course.id, status: "ACTIVE" },
    });

    await expect(
      prisma.enrollment.create({
        data: { userId: user.id, courseId: course.id, status: "ACTIVE" },
      })
    ).rejects.toThrow();
  });

  it("should complete an enrollment", async () => {
    const user = await createTestUser(prisma, { email: "complete@test.com" });
    const course = await createTestCourse(prisma);

    await prisma.enrollment.create({
      data: { userId: user.id, courseId: course.id, status: "ACTIVE" },
    });

    const updated = await prisma.enrollment.update({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    expect(updated.status).toBe("COMPLETED");
    expect(updated.completedAt).toBeDefined();
  });
});
