/**
 * Test Setup
 *
 * Configures the test environment with proper database isolation.
 * Each test file creates a unique in-memory SQLite database to
 * prevent test pollution when running in parallel.
 */

import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ──────────────────────────────────────────
// Isolated Database per Test File
// ──────────────────────────────────────────
// Uses a unique database URL per test file to allow parallel execution

let prisma: PrismaClient | null = null;

export function getTestDb(): PrismaClient {
  if (!prisma) {
    const uniqueName = `test-${crypto.randomBytes(4).toString("hex")}.db`;
    prisma = new PrismaClient({
      datasources: {
        db: { url: `file:./${uniqueName}` },
      },
    });
  }
  return prisma;
}

export async function cleanupTestDb() {
  if (!prisma) return;
  await prisma.$transaction([
    prisma.certificate.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.questionOption.deleteMany(),
    prisma.question.deleteMany(),
    prisma.quiz.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.enrollment.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.module.deleteMany(),
    prisma.course.deleteMany(),
    prisma.review.deleteMany(),
    prisma.userBadge.deleteMany(),
    prisma.userStreak.deleteMany(),
    prisma.userXP.deleteMany(),
    prisma.achievement.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function closeTestDb() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// ──────────────────────────────────────────
// Test Helpers
// ──────────────────────────────────────────

export async function createTestUser(prisma: PrismaClient, overrides: Partial<any> = {}) {
  const passwordHash = await bcrypt.hash("test123", 10);
  return prisma.user.create({
    data: {
      name: "Test User",
      email: `test-${crypto.randomBytes(4).toString("hex")}@test.com`,
      passwordHash,
      role: "STUDENT",
      ...overrides,
    },
  });
}

export async function createTestCourse(prisma: PrismaClient, overrides: Partial<any> = {}) {
  return prisma.course.create({
    data: {
      title: "Test Course",
      description: "A test course for unit tests",
      published: true,
      price: 0,
      ...overrides,
    },
  });
}

export async function createTestModule(prisma: PrismaClient, courseId: string, overrides: Partial<any> = {}) {
  return prisma.module.create({
    data: {
      title: "Test Module",
      orderIndex: 1,
      courseId,
      ...overrides,
    },
  });
}

export async function createTestLesson(prisma: PrismaClient, moduleId: string, overrides: Partial<any> = {}) {
  return prisma.lesson.create({
    data: {
      title: "Test Lesson",
      contentType: "VIDEO",
      contentUrl: "https://www.youtube.com/embed/test",
      duration: 300,
      orderIndex: 1,
      moduleId,
      ...overrides,
    },
  });
}

// ──────────────────────────────────────────
// Mock NextAuth Session
// ──────────────────────────────────────────

export function createMockSession(overrides: Partial<any> = {}) {
  return {
    user: {
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      role: "STUDENT",
      ...overrides,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}
