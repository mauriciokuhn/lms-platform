import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser, createTestCourse } from "../setup";

const prisma = getTestDb();

beforeAll(async () => {
  await cleanupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe("Reviews", () => {
  it("should create a review with rating and comment", async () => {
    const user = await createTestUser(prisma, { email: "review-create@test.com" });
    const course = await createTestCourse(prisma);

    const review = await prisma.review.create({
      data: { userId: user.id, courseId: course.id, rating: 5, comment: "Excelente curso!" },
    });

    expect(review.rating).toBe(5);
    expect(review.comment).toBe("Excelente curso!");
    expect(review.userId).toBe(user.id);
    expect(review.courseId).toBe(course.id);
  });

  it("should allow a review without comment", async () => {
    const user = await createTestUser(prisma, { email: "review-no-comment@test.com" });
    const course = await createTestCourse(prisma);

    const review = await prisma.review.create({
      data: { userId: user.id, courseId: course.id, rating: 3 },
    });

    expect(review.rating).toBe(3);
    expect(review.comment).toBeNull();
  });

  it("should prevent a user from reviewing the same course twice", async () => {
    const user = await createTestUser(prisma, { email: "review-dup@test.com" });
    const course = await createTestCourse(prisma);

    await prisma.review.create({
      data: { userId: user.id, courseId: course.id, rating: 4 },
    });

    await expect(
      prisma.review.create({
        data: { userId: user.id, courseId: course.id, rating: 2 },
      })
    ).rejects.toThrow();
  });

  it("should update an existing review via upsert", async () => {
    const user = await createTestUser(prisma, { email: "review-upsert@test.com" });
    const course = await createTestCourse(prisma);

    // First upsert creates the review (create branch)
    const created = await prisma.review.upsert({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      update: { rating: 1, comment: "Mudei de ideia" },
      create: { userId: user.id, courseId: course.id, rating: 5 },
    });
    expect(created.rating).toBe(5);

    // Second upsert updates it in place (update branch)
    const updated = await prisma.review.upsert({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      update: { rating: 1, comment: "Mudei de ideia" },
      create: { userId: user.id, courseId: course.id, rating: 5 },
    });
    expect(updated.rating).toBe(1);
    expect(updated.comment).toBe("Mudei de ideia");

    const count = await prisma.review.count({
      where: { userId: user.id, courseId: course.id },
    });
    expect(count).toBe(1);
  });

  it("should compute average rating and total count", async () => {
    const course = await createTestCourse(prisma, { title: "Curso com avaliações" });

    const user1 = await createTestUser(prisma, { email: "review-avg-1@test.com" });
    const user2 = await createTestUser(prisma, { email: "review-avg-2@test.com" });
    const user3 = await createTestUser(prisma, { email: "review-avg-3@test.com" });

    await prisma.review.createMany({
      data: [
        { userId: user1.id, courseId: course.id, rating: 5 },
        { userId: user2.id, courseId: course.id, rating: 4 },
        { userId: user3.id, courseId: course.id, rating: 3 },
      ],
    });

    const aggregate = await prisma.review.aggregate({
      where: { courseId: course.id },
      _avg: { rating: true },
      _count: { id: true },
    });

    expect(aggregate._count.id).toBe(3);
    expect(aggregate._avg.rating).toBe(4); // (5 + 4 + 3) / 3
  });

  it("should build the rating distribution map", async () => {
    const course = await createTestCourse(prisma, { title: "Curso distribuição" });

    const user1 = await createTestUser(prisma, { email: "review-dist-1@test.com" });
    const user2 = await createTestUser(prisma, { email: "review-dist-2@test.com" });

    await prisma.review.createMany({
      data: [
        { userId: user1.id, courseId: course.id, rating: 5 },
        { userId: user2.id, courseId: course.id, rating: 5 },
      ],
    });

    const distributionRaw = await prisma.review.groupBy({
      by: ["rating"],
      where: { courseId: course.id },
      _count: { id: true },
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const entry of distributionRaw) {
      distribution[entry.rating] = entry._count.id;
    }

    expect(distribution[5]).toBe(2);
    expect(distribution[4]).toBe(0);
    expect(distribution[1]).toBe(0);
  });
});
