/**
 * Route-level tests for the course approval workflow:
 *   POST /api/courses/[id]/submit-approval (instructor)
 *   POST /api/admin/courses/[id]/approve     (admin)
 *
 * Covers role guards (401), ownership (403), validation (400), the pending
 * state transition, and both approve/reject branches with notifications.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));

vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

import type { NextRequest } from "next/server";
import { POST as SubmitApproval } from "@/app/api/courses/[id]/submit-approval/route";
import { POST as AdminApprove } from "@/app/api/admin/courses/[id]/approve/route";
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

function submit(courseId: string, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request(`http://localhost/api/courses/${courseId}/submit-approval`, {
    method: "POST",
  }) as unknown as NextRequest;
  return SubmitApproval(req, { params: Promise.resolve({ id: courseId }) });
}

function approve(courseId: string, body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  const req = new Request(`http://localhost/api/admin/courses/${courseId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
  return AdminApprove(req, { params: Promise.resolve({ id: courseId }) });
}

describe("Course approval workflow", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("submit-approval returns 401 for non-instructors", async () => {
    const student = await createTestUser(prisma, { email: "appr-student@test.com" });
    const course = await createTestCourse(prisma);

    const res = await submit(course.id, createMockSession({ id: student.id, role: "STUDENT" }));
    expect(res.status).toBe(401);
  });

  it("submit-approval returns 403 when the course belongs to another instructor", async () => {
    const owner = await createTestUser(prisma, { email: "appr-owner@test.com", role: "INSTRUCTOR" });
    const other = await createTestUser(prisma, { email: "appr-other@test.com", role: "INSTRUCTOR" });
    const course = await createTestCourse(prisma, { instructorId: owner.id });

    const res = await submit(course.id, createMockSession({ id: other.id, role: "INSTRUCTOR" }));
    expect(res.status).toBe(403);
  });

  it("submit-approval rejects a course without modules or lessons", async () => {
    const instructor = await createTestUser(prisma, { email: "appr-empty@test.com", role: "INSTRUCTOR" });
    const course = await createTestCourse(prisma, { instructorId: instructor.id });

    const res = await submit(course.id, createMockSession({ id: instructor.id, role: "INSTRUCTOR" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("módulo");
  });

  it("submit-approval moves a complete course to pending and notifies admins", async () => {
    const instructor = await createTestUser(prisma, { email: "appr-ok@test.com", role: "INSTRUCTOR" });
    const admin = await createTestUser(prisma, { email: "appr-admin@test.com", role: "ADMIN" });
    const course = await createTestCourse(prisma, { instructorId: instructor.id });
    const mod = await createTestModule(prisma, course.id);
    await createTestLesson(prisma, mod.id);

    const res = await submit(course.id, createMockSession({ id: instructor.id, role: "INSTRUCTOR" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const updated = await prisma.course.findUnique({ where: { id: course.id } });
    expect(updated?.approvalStatus).toBe("pending");

    const notif = await prisma.notification.findFirst({
      where: { userId: admin.id, type: "ADMIN_ALERT" },
    });
    expect(notif?.message).toContain(course.title);
  });

  it("submit-approval is rejected when already pending", async () => {
    const instructor = await createTestUser(prisma, { email: "appr-dup@test.com", role: "INSTRUCTOR" });
    const course = await createTestCourse(prisma, { instructorId: instructor.id, approvalStatus: "pending" });

    const res = await submit(course.id, createMockSession({ id: instructor.id, role: "INSTRUCTOR" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("aguardando aprovação");
  });

  it("approve returns 401 for non-admins and 400 for an invalid action", async () => {
    const admin = await createTestUser(prisma, { email: "appr-admin2@test.com", role: "ADMIN" });
    const student = await createTestUser(prisma, { email: "appr-nonadmin@test.com", role: "STUDENT" });
    const course = await createTestCourse(prisma, { approvalStatus: "pending" });

    // The 401 must come from the approve route itself (not submit-approval),
    // so call approve() with a STUDENT session.
    const nonAdmin = await approve(
      course.id,
      { action: "approve" },
      createMockSession({ id: student.id, role: "STUDENT" })
    );
    expect(nonAdmin.status).toBe(401);

    const badAction = await approve(course.id, { action: "maybe" }, createMockSession({ id: admin.id, role: "ADMIN" }));
    expect(badAction.status).toBe(400);
  });

  it("admin approves a pending course: published + notification to instructor", async () => {
    const admin = await createTestUser(prisma, { email: "appr-admin3@test.com", role: "ADMIN" });
    const instructor = await createTestUser(prisma, { email: "appr-instr3@test.com", role: "INSTRUCTOR" });
    const course = await createTestCourse(prisma, {
      instructorId: instructor.id,
      approvalStatus: "pending",
      published: false,
    });

    const res = await approve(course.id, { action: "approve" }, createMockSession({ id: admin.id, role: "ADMIN" }));
    expect(res.status).toBe(200);

    const updated = await prisma.course.findUnique({ where: { id: course.id } });
    expect(updated?.approvalStatus).toBe("approved");
    expect(updated?.published).toBe(true);

    const notif = await prisma.notification.findFirst({
      where: { userId: instructor.id, type: "COURSE_PUBLISHED" },
    });
    expect(notif).not.toBeNull();
  });

  it("admin rejects a pending course and requires a reason", async () => {
    const admin = await createTestUser(prisma, { email: "appr-admin4@test.com", role: "ADMIN" });
    const course = await createTestCourse(prisma, { approvalStatus: "pending", published: false });

    const noReason = await approve(course.id, { action: "reject" }, createMockSession({ id: admin.id, role: "ADMIN" }));
    expect(noReason.status).toBe(400);
    expect((await noReason.json()).error).toContain("motivo");

    const rejected = await approve(
      course.id,
      { action: "reject", rejectionReason: "Conteúdo incompleto" },
      createMockSession({ id: admin.id, role: "ADMIN" })
    );
    expect(rejected.status).toBe(200);

    const updated = await prisma.course.findUnique({ where: { id: course.id } });
    expect(updated?.approvalStatus).toBe("rejected");
    expect(updated?.published).toBe(false);
    expect(updated?.rejectionReason).toBe("Conteúdo incompleto");
  });

  it("approve returns 404 for a non-existent course", async () => {
    const admin = await createTestUser(prisma, { email: "appr-admin5@test.com", role: "ADMIN" });
    const res = await approve("nao-existe", { action: "approve" }, createMockSession({ id: admin.id, role: "ADMIN" }));
    expect(res.status).toBe(404);
  });
});
