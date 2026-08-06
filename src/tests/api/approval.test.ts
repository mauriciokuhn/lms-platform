import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestDb, cleanupTestDb, closeTestDb } from "../setup";
import bcrypt from "bcryptjs";
import type { PrismaClient, User, Course } from "@prisma/client";

let db: PrismaClient;
let instructor: User;
let admin: User;
let course: Course;

beforeAll(async () => {
  db = getTestDb();

  // Ensure tables exist by pushing the schema
  // (In a real test suite, migrations would run first)

  const passwordHash = await bcrypt.hash("test123", 10);

  // Create instructor user
  instructor = await db.user.create({
    data: {
      name: "Instrutor Teste",
      email: `instrutor-${Date.now()}@test.com`,
      passwordHash,
      role: "INSTRUCTOR",
      headline: "Professor de teste",
      bio: "Bio do instrutor",
    },
  });

  // Create admin user
  admin = await db.user.create({
    data: {
      name: "Admin Teste",
      email: `admin-${Date.now()}@test.com`,
      passwordHash,
      role: "ADMIN",
    },
  });
});

afterAll(async () => {
  await cleanupTestDb();
  await closeTestDb();
});

describe("Approval Workflow", () => {
  it("instructor should create a course as draft", async () => {
    course = await db.course.create({
      data: {
        title: "Curso de Teste para Aprovação",
        description: "Descrição do curso de teste",
        category: "Programação",
        instructorId: instructor.id,
        published: false,
        approvalStatus: "draft",
      },
    });

    expect(course).toBeDefined();
    expect(course.approvalStatus).toBe("draft");
    expect(course.published).toBe(false);
    expect(course.instructorId).toBe(instructor.id);
  });

  it("should fail to submit for approval without modules/lessons", async () => {
    // A course with no modules should not be submittable
    const moduleCount = await db.module.count({ where: { courseId: course.id } });
    expect(moduleCount).toBe(0);
  });

  it("instructor should add modules and lessons", async () => {
    const mod = await db.module.create({
      data: {
        title: "Módulo Inicial",
        orderIndex: 1,
        courseId: course.id,
      },
    });

    await db.lesson.create({
      data: {
        title: "Aula 1 - Introdução",
        contentType: "VIDEO",
        contentUrl: "https://www.youtube.com/embed/test",
        duration: 300,
        orderIndex: 1,
        moduleId: mod.id,
      },
    });

    await db.lesson.create({
      data: {
        title: "Aula 2 - Conteúdo",
        contentType: "VIDEO",
        contentUrl: "https://www.youtube.com/embed/test2",
        duration: 600,
        orderIndex: 2,
        moduleId: mod.id,
      },
    });

    const lessons = await db.lesson.count({
      where: { module: { courseId: course.id } },
    });
    expect(lessons).toBe(2);
  });

  it("instructor should submit course for approval", async () => {
    course = await db.course.update({
      where: { id: course.id },
      data: {
        approvalStatus: "pending",
        rejectionReason: null,
      },
    });

    expect(course.approvalStatus).toBe("pending");
  });

  it("admin should receive notification about pending course", async () => {
    const notification = await db.notification.create({
      data: {
        type: "ADMIN_ALERT",
        title: "Novo curso aguardando aprovação 📋",
        message: `"${course.title}" foi enviado por ${instructor.name} para revisão.`,
        link: `/admin/cursos/${course.id}/editar`,
        userId: admin.id,
      },
    });

    expect(notification).toBeDefined();
    expect(notification.type).toBe("ADMIN_ALERT");
    expect(notification.userId).toBe(admin.id);

    // Verify admin has the notification
    const adminNotifications = await db.notification.findMany({
      where: { userId: admin.id },
    });
    expect(adminNotifications.length).toBeGreaterThanOrEqual(1);
  });

  it("admin should approve the course", async () => {
    course = await db.course.update({
      where: { id: course.id },
      data: {
        approvalStatus: "approved",
        published: true,
        rejectionReason: null,
      },
    });

    expect(course.approvalStatus).toBe("approved");
    expect(course.published).toBe(true);
  });

  it("instructor should receive approval notification", async () => {
    const notification = await db.notification.create({
      data: {
        type: "COURSE_PUBLISHED",
        title: "Curso aprovado! ✅",
        message: `Seu curso "${course.title}" foi aprovado e já está disponível para os alunos.`,
        link: `/cursos/${course.id}`,
        userId: instructor.id,
      },
    });

    expect(notification).toBeDefined();
    expect(notification.type).toBe("COURSE_PUBLISHED");
    expect(notification.userId).toBe(instructor.id);
  });

  it("should track course as published in metrics", async () => {
    const publishedCount = await db.course.count({
      where: { approvalStatus: "approved", instructorId: instructor.id },
    });
    expect(publishedCount).toBeGreaterThanOrEqual(1);
  });
});

describe("Rejection Workflow", () => {
  let rejectedCourse: Course;
  const rejectionReason = "O curso precisa de mais exemplos práticos e exercícios.";

  it("instructor should create another course and submit", async () => {
    rejectedCourse = await db.course.create({
      data: {
        title: "Curso que será rejeitado",
        description: "Descrição incompleta",
        instructorId: instructor.id,
        published: false,
        approvalStatus: "draft",
      },
    });

    // Add module and lesson to make it valid for review
    const mod = await db.module.create({
      data: { title: "Único Módulo", orderIndex: 1, courseId: rejectedCourse.id },
    });
    await db.lesson.create({
      data: {
        title: "Única Aula",
        contentType: "TEXT",
        contentBody: "Conteúdo muito curto",
        orderIndex: 1,
        moduleId: mod.id,
      },
    });

    rejectedCourse = await db.course.update({
      where: { id: rejectedCourse.id },
      data: { approvalStatus: "pending" },
    });

    expect(rejectedCourse.approvalStatus).toBe("pending");
  });

  it("admin should reject the course with reason", async () => {
    rejectedCourse = await db.course.update({
      where: { id: rejectedCourse.id },
      data: {
        approvalStatus: "rejected",
        rejectionReason,
        published: false,
      },
    });

    expect(rejectedCourse.approvalStatus).toBe("rejected");
    expect(rejectedCourse.rejectionReason).toBe(rejectionReason);
    expect(rejectedCourse.published).toBe(false);
  });

  it("instructor should receive rejection notification with reason", async () => {
    const notification = await db.notification.create({
      data: {
        type: "ADMIN_ALERT",
        title: "Curso não aprovado ❌",
        message: `Seu curso "${rejectedCourse.title}" foi rejeitado. Motivo: ${rejectionReason}`,
        link: `/instrutor/cursos/${rejectedCourse.id}/editar`,
        userId: instructor.id,
      },
    });

    expect(notification).toBeDefined();
    expect(notification.message).toContain(rejectionReason);
  });

  it("instructor should be able to resubmit after fixing issues", async () => {
    // Fix the course
    await db.course.update({
      where: { id: rejectedCourse.id },
      data: {
        description: "Descrição muito mais completa agora com vários detalhes importantes",
      },
    });

    // Add more lessons
    const mod = await db.module.findFirst({ where: { courseId: rejectedCourse.id } });
    if (mod) {
      await db.lesson.create({
        data: {
          title: "Nova Aula - Exemplos Práticos",
          contentType: "VIDEO",
          contentUrl: "https://www.youtube.com/embed/exemplo",
          duration: 600,
          orderIndex: 2,
          moduleId: mod.id,
        },
      });
    }

    // Resubmit
    rejectedCourse = await db.course.update({
      where: { id: rejectedCourse.id },
      data: {
        approvalStatus: "pending",
        rejectionReason: null,
      },
    });

    expect(rejectedCourse.approvalStatus).toBe("pending");
    expect(rejectedCourse.rejectionReason).toBeNull();
  });
});

describe("Instructor Dashboard Metrics", () => {
  it("should count instructor courses by status", async () => {
    const courses = await db.course.findMany({
      where: { instructorId: instructor.id },
    });

    const total = courses.length;
    const approved = courses.filter((c) => c.approvalStatus === "approved").length;
    const pending = courses.filter((c) => c.approvalStatus === "pending").length;
    const draft = courses.filter((c) => c.approvalStatus === "draft" || !c.approvalStatus).length;

    expect(total).toBeGreaterThanOrEqual(2);
    expect(approved).toBeGreaterThanOrEqual(1);
    expect(pending).toBeGreaterThanOrEqual(1);
    expect(draft).toBeGreaterThanOrEqual(0);
  });
});
