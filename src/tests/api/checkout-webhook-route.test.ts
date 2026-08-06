/**
 * Route-level tests for POST /api/checkout/webhook (Stripe).
 *
 * Covers: no-secret/signature pass-through, invalid signature → 400, course
 * enrollment on checkout.session.completed, plan upgrade (PRO) + subscription
 * upsert, subscription updated/deleted status sync and the FREE-plan revert.
 * Stripe and @/lib/db are mocked; DB writes land in the isolated test db.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";

const dbHolder = vi.hoisted(() => ({ prisma: null as PrismaClient | null }));
vi.mock("@/lib/db", () => ({
  get db() {
    return dbHolder.prisma;
  },
}));

const stripeConstructEvent = vi.hoisted(() => vi.fn());
vi.mock("stripe", () => ({
  default: vi.fn(() => ({
    webhooks: { constructEvent: stripeConstructEvent },
    checkout: { sessions: { create: vi.fn() } },
  })),
}));

import { POST } from "@/app/api/checkout/webhook/route";
import { getTestDb, cleanupTestDb, closeTestDb, createTestUser, createTestCourse } from "../setup";

const prisma = getTestDb();
dbHolder.prisma = prisma;

function post(body: string, signature?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature) headers["stripe-signature"] = signature;
  return POST(new Request("http://localhost/api/checkout/webhook", { method: "POST", body, headers }));
}

function event(type: string, object: Record<string, unknown>) {
  return { type, data: { object } };
}

describe("POST /api/checkout/webhook", () => {
  beforeAll(async () => {
    await cleanupTestDb();
  });

  // Each test creates its own users/subscriptions — wipe between tests so
  // global counts (e.g. prisma.subscription.count()) stay deterministic.
  beforeEach(async () => {
    await cleanupTestDb();
    stripeConstructEvent.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("acks without processing when the webhook secret or signature is missing", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", ""); // empty = unset for the route check
    const res = await post("{}");
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);

    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    const res2 = await post("{}", undefined); // no signature
    expect(res2.status).toBe(200);
    expect((await res2.json()).received).toBe(true);
    expect(stripeConstructEvent).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature with 400", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    stripeConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found");
    });

    const res = await post("body", "bad-signature");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid signature");
  });

  it("enrolls the user when checkout.session.completed carries a courseId", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");

    const user = await createTestUser(prisma, { email: "wh-course@test.com" });
    const course = await createTestCourse(prisma, { title: "Curso do Webhook" });

    stripeConstructEvent.mockReturnValue(
      event("checkout.session.completed", {
        metadata: { userId: user.id, courseId: course.id },
      })
    );

    const res = await post("raw-body", "sig");
    expect(res.status).toBe(200);

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    expect(enrollment?.status).toBe("ACTIVE");
  });

  it("upgrades the plan and upserts a subscription for a plan checkout", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");

    const user = await createTestUser(prisma, { email: "wh-plan@test.com" });

    stripeConstructEvent.mockReturnValue(
      event("checkout.session.completed", {
        metadata: { userId: user.id, planId: "plan-pro" },
        subscription: "sub_123",
        customer: "cus_123",
      })
    );

    const res = await post("raw-body", "sig");
    expect(res.status).toBe(200);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.plan).toBe("PRO");

    const sub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: "sub_123" },
    });
    expect(sub?.plan).toBe("PRO");
    expect(sub?.status).toBe("active");
  });

  it("reverts the plan to FREE when the subscription is deleted", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");

    const user = await createTestUser(prisma, { email: "wh-cancel@test.com", plan: "PRO" });
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "PRO",
        status: "active",
        stripeSubscriptionId: "sub_cancel_1",
      },
    });

    stripeConstructEvent.mockReturnValue(
      event("customer.subscription.deleted", { id: "sub_cancel_1" })
    );

    const res = await post("raw-body", "sig");
    expect(res.status).toBe(200);

    const sub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: "sub_cancel_1" },
    });
    expect(sub?.status).toBe("canceled");
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.plan).toBe("FREE");
  });

  it("maps past_due subscription updates", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");

    const user = await createTestUser(prisma, { email: "wh-pastdue@test.com" });
    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: "PRO",
        status: "active",
        stripeSubscriptionId: "sub_pd_1",
      },
    });

    stripeConstructEvent.mockReturnValue(
      event("customer.subscription.updated", { id: "sub_pd_1", status: "past_due" })
    );

    const res = await post("raw-body", "sig");
    expect(res.status).toBe(200);

    const sub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: "sub_pd_1" },
    });
    expect(sub?.status).toBe("past_due");
  });

  it("ignores unknown event types", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
    stripeConstructEvent.mockReturnValue(event("invoice.paid", { id: "in_1" }));

    const res = await post("raw-body", "sig");
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    expect(await prisma.subscription.count()).toBe(0);
  });
});
