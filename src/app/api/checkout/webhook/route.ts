import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Stripe Webhook Handler
 *
 * Handles checkout.session.completed events to enroll users
 * after successful payment.
 *
 * Requires STRIPE_WEBHOOK_SECRET to verify webhook signatures.
 */

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    // If Stripe webhook secret is not configured, ignore webhook
    if (!process.env.STRIPE_WEBHOOK_SECRET || !signature) {
      return NextResponse.json({ received: true });
    }

    const stripe = new (await import("stripe").then((m) => m.default))(
      process.env.STRIPE_SECRET_KEY!
    );

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error("Webhook signature verification failed", { error: err instanceof Error ? err.message : String(err) });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const checkoutSession = event.data.object as {
      metadata?: Record<string, string> | null;
      subscription?: string | null;
      customer?: string | null;
    };
    const { userId, courseId, planId } = checkoutSession.metadata || {};

    if (event.type === "checkout.session.completed") {
      // ── Plan subscription ──
      if (planId && userId) {
        const planMap: Record<string, "PRO" | "ENTERPRISE"> = {
          "plan-pro": "PRO",
          "plan-enterprise": "ENTERPRISE",
        };
        const plan = planMap[planId];

        if (plan) {
          const { db } = await import("@/lib/db");

          // Update user plan
          await db.user.update({
            where: { id: userId },
            data: { plan },
          });

          // Create/update subscription record
          await db.subscription.upsert({
            where: { stripeSubscriptionId: checkoutSession.subscription || "manual-" + userId },
            create: {
              userId,
              plan,
              status: "active",
              stripeSubscriptionId: checkoutSession.subscription || null,
              stripeCustomerId: checkoutSession.customer || null,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            update: {
              plan,
              status: "active",
              stripeSubscriptionId: checkoutSession.subscription || undefined,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          logger.info("Plan upgraded", { userId, plan });
        }
      }

      // ── Course enrollment ──
      if (userId && courseId && !planId) {
        const { db } = await import("@/lib/db");
        await db.enrollment.upsert({
          where: {
            userId_courseId: { userId, courseId },
          },
          update: { status: "ACTIVE", enrolledAt: new Date() },
          create: {
            userId,
            courseId,
            status: "ACTIVE",
            enrolledAt: new Date(),
          },
        });
        logger.info("Enrollment created via webhook", { userId, courseId });
      }
    }

    // Handle subscription updates
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as { id: string; status?: string };
      const { db } = await import("@/lib/db");

      const status = event.type === "customer.subscription.deleted" ? "canceled" :
        subscription.status === "past_due" ? "past_due" :
        subscription.status === "canceled" ? "canceled" : "active";

      await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status },
      });

      // If canceled, revert to FREE plan
      if (status === "canceled") {
        const sub = await db.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          await db.user.update({
            where: { id: sub.userId },
            data: { plan: "FREE" },
          });
          logger.info("Plan reverted to FREE", { userId: sub.userId });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("POST /api/checkout/webhook error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}
