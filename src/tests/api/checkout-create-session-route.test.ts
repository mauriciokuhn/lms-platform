/**
 * Route-level tests for POST /api/checkout/create-session.
 *
 * Covers the auth guard, payload validation, direct enrollment for free
 * courses / unconfigured Stripe, the Stripe Checkout path (course and plan)
 * and the Stripe error branch. The `stripe` package and `@/lib/db` are
 * mocked; real enrollments go to the isolated test database.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));
vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

const stripeCreateSession = vi.hoisted(() => vi.fn());
vi.mock("stripe", () => ({
  default: vi.fn(() => ({
    checkout: { sessions: { create: stripeCreateSession } },
    webhooks: { constructEvent: vi.fn() },
  })),
}));

import { POST } from "@/app/api/checkout/create-session/route";
import {
  getTestDb,
  cleanupTestDb,
  closeTestDb,
  createTestUser,
  createTestCourse,
  createMockSession,
} from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

function post(body: unknown, session: unknown = null) {
  authMock.auth.mockResolvedValue(session);
  return POST(
    new Request("http://localhost/api/checkout/create-session", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  );
}

describe("POST /api/checkout/create-session", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await cleanupTestDb();
    stripeCreateSession.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns 401 when not authenticated", async () => {
    const res = await post({ courseId: "c1", courseTitle: "X" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const user = await createTestUser(prisma, { email: "ck-user@test.com" });
    const session = createMockSession({ id: user.id });

    expect((await post({ courseTitle: "Sem id" }, session)).status).toBe(400);
    expect((await post({ courseId: "c1" }, session)).status).toBe(400);
  });

  it("enrolls directly when the course is free", async () => {
    const user = await createTestUser(prisma, { email: "ck-free@test.com" });
    const course = await createTestCourse(prisma, { title: "Curso Grátis", price: 0 });

    const res = await post(
      { courseId: course.id, courseTitle: "Curso Grátis", coursePrice: 0 },
      createMockSession({ id: user.id })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enrolled).toBe(true);

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    expect(enrollment?.status).toBe("ACTIVE");
  });

  it("enrolls directly when Stripe is not configured even for a paid course", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", ""); // empty = unset for the route check
    const user = await createTestUser(prisma, { email: "ck-nokey@test.com" });
    const course = await createTestCourse(prisma, { title: "Curso Pago", price: 50 });

    const res = await post(
      { courseId: course.id, courseTitle: "Curso Pago", coursePrice: 50 },
      createMockSession({ id: user.id })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enrolled).toBe(true);
    expect(stripeCreateSession).not.toHaveBeenCalled();
  });

  it("creates a Stripe Checkout session for a paid course", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.lms.com");
    stripeCreateSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay_1" });

    const user = await createTestUser(prisma, { email: "ck-stripe@test.com" });

    const res = await post(
      { courseId: "course-abc", courseTitle: "React Avançado", coursePrice: 99.9 },
      createMockSession({ id: user.id })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe("https://checkout.stripe.com/c/pay_1");

    // The route calls sessions.create(config) with a single argument.
    const [createArgs] = stripeCreateSession.mock.calls[0];
    // Stripe puts unit_amount inside price_data (cents).
    expect(createArgs.line_items[0].price_data.unit_amount).toBe(9990);
    expect(createArgs.mode).toBe("payment");
    expect(createArgs.success_url).toBe("https://app.lms.com/cursos/course-abc?checkout=success");
    expect(createArgs.metadata).toEqual({ userId: user.id, courseId: "course-abc" });
  });

  it("activates a free plan without Stripe", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const user = await createTestUser(prisma, { email: "ck-plan@test.com" });

    const res = await post(
      { courseId: "plan-pro", courseTitle: "Plano Pro", coursePrice: 0, planId: "plan-pro" },
      createMockSession({ id: user.id })
    );

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("Plano ativado");
    expect(stripeCreateSession).not.toHaveBeenCalled();
  });

  it("creates a Stripe session for a paid plan with planId in metadata", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    stripeCreateSession.mockResolvedValue({ url: "https://checkout.stripe.com/c/plan_1" });

    const user = await createTestUser(prisma, { email: "ck-planpaid@test.com" });

    const res = await post(
      { courseId: "plan-enterprise", courseTitle: "Enterprise", coursePrice: 199, planId: "plan-enterprise" },
      createMockSession({ id: user.id })
    );

    expect(res.status).toBe(200);
    const [createArgs] = stripeCreateSession.mock.calls[0];
    expect(createArgs.metadata).toEqual({ userId: user.id, planId: "plan-enterprise" });
    expect(createArgs.success_url).toContain("/planos?success=true");
  });

  it("returns 500 when Stripe throws", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    stripeCreateSession.mockRejectedValue(new Error("card declined"));
    const user = await createTestUser(prisma, { email: "ck-err@test.com" });

    const res = await post(
      { courseId: "course-err", courseTitle: "X", coursePrice: 30 },
      createMockSession({ id: user.id })
    );

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Erro ao processar pagamento");
  });
});
