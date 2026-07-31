import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser } from "../setup";

const prisma = getTestDb();

beforeAll(async () => {
  await cleanupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe("Authentication", () => {
  it("should hash passwords correctly", async () => {
    const password = "securePassword123";
    const hash = await bcrypt.hash(password, 10);
    const isValid = await bcrypt.compare(password, hash);

    expect(isValid).toBe(true);
    expect(hash).not.toBe(password);
  });

  it("should reject wrong passwords", async () => {
    const hash = await bcrypt.hash("correctPassword", 10);
    const isValid = await bcrypt.compare("wrongPassword", hash);

    expect(isValid).toBe(false);
  });

  it("should create and authenticate a user", async () => {
    const user = await createTestUser(prisma, { email: "auth-test@test.com" });

    expect(user.email).toBe("auth-test@test.com");
    expect(user.role).toBe("STUDENT");

    const isValid = await bcrypt.compare("test123", user.passwordHash!);
    expect(isValid).toBe(true);
  });

  it("should enforce unique emails", async () => {
    await createTestUser(prisma, { email: "unique-test@test.com" });

    await expect(
      createTestUser(prisma, { email: "unique-test@test.com" })
    ).rejects.toThrow();
  });

  it("should create admin users with ADMIN role", async () => {
    const admin = await createTestUser(prisma, {
      name: "Admin Test",
      email: "admin-test-case@test.com",
      role: "ADMIN",
    });

    expect(admin.role).toBe("ADMIN");
  });

  it("should create users with INSTRUCTOR role", async () => {
    const instructor = await createTestUser(prisma, {
      name: "Instrutor Test",
      email: "instrutor-test@test.com",
      role: "INSTRUCTOR",
      headline: "Test Headline",
      bio: "Test bio for instructor",
    });

    expect(instructor.role).toBe("INSTRUCTOR");
    expect(instructor.headline).toBe("Test Headline");
  });
});
