/**
 * Test Setup
 *
 * Configures the test environment with proper database isolation.
 * Each test file creates a unique in-memory SQLite database to
 * prevent test pollution when running in parallel.
 */

import { PrismaClient } from "../generated/prisma/client";
import type { Prisma } from "../generated/prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ──────────────────────────────────────────
// Isolated Database per Test File
// ──────────────────────────────────────────
// Uses a unique database URL per test file to allow parallel execution

let prisma: PrismaClient | null = null;
let activeTestDbFile: string | null = null;

/**
 * Pushes the Prisma schema into the isolated test database.
 *
 * The isolated SQLite file starts empty, so without this step every query
 * fails with "table does not exist". The main schema hardcodes
 * `url = "file:./dev.db"` (an env override is ignored), so we write a
 * temporary schema next to it with the URL swapped to the test DB. Because
 * the temp schema lives in prisma/, the relative `file:./test-*.db` URL
 * resolves to the same directory the PrismaClient uses at runtime.
 */
function bootstrapTestSchema(testDbUrl: string) {
  const prismaDir = path.join(process.cwd(), "prisma");
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  const tempSchemaPath = path.join(
    prismaDir,
    `test-schema-${crypto.randomBytes(4).toString("hex")}.prisma`
  );

  const patched = fs
    .readFileSync(path.join(prismaDir, "schema.prisma"), "utf8")
    .replace(/url\s*=\s*"file:\.\/dev\.db"/, `url = "${testDbUrl}"`);
  fs.writeFileSync(tempSchemaPath, patched);

  try {
    execSync(`node "${prismaCli}" db push --skip-generate --schema "${tempSchemaPath}"`, {
      stdio: ["ignore", "ignore", "pipe"],
      timeout: 60_000,
    });
  } catch (err) {
    const stderr = (err as { stderr?: Buffer | string })?.stderr?.toString() || String(err);
    throw new Error(`Falha ao criar schema de teste: ${stderr}`);
  } finally {
    fs.unlinkSync(tempSchemaPath);
  }
}

export function getTestDb(): PrismaClient {
  if (!prisma) {
    const uniqueName = `test-${crypto.randomBytes(4).toString("hex")}.db`;
    const testDbUrl = `file:./${uniqueName}`;
    bootstrapTestSchema(testDbUrl);
    prisma = new PrismaClient({
      datasources: {
        db: { url: testDbUrl },
      },
    });
    activeTestDbFile = path.join(process.cwd(), "prisma", uniqueName);
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
  // Delete the throwaway SQLite file so test runs don't accumulate
  // dozens of test-*.db files in prisma/.
  if (activeTestDbFile) {
    try {
      fs.rmSync(activeTestDbFile, { force: true });
    } catch {
      // Best-effort cleanup — ignore (e.g. file locked on Windows).
    }
    activeTestDbFile = null;
  }
}

// ──────────────────────────────────────────
// Test Helpers
// ──────────────────────────────────────────

export async function createTestUser(prisma: PrismaClient, overrides: Partial<Prisma.UserCreateInput> = {}) {
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

export async function createTestCourse(prisma: PrismaClient, overrides: Partial<Prisma.CourseUncheckedCreateInput> = {}) {
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

export async function createTestModule(prisma: PrismaClient, courseId: string, overrides: Partial<Prisma.ModuleUncheckedCreateInput> = {}) {
  return prisma.module.create({
    data: {
      title: "Test Module",
      orderIndex: 1,
      courseId,
      ...overrides,
    },
  });
}

export async function createTestLesson(prisma: PrismaClient, moduleId: string, overrides: Partial<Prisma.LessonUncheckedCreateInput> = {}) {
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

export function createMockSession(overrides: Partial<Record<string, unknown>> = {}) {
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
