import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * Stripe Checkout Session Creator
 *
 * Creates a Stripe Checkout Session for course enrollment.
 * Requires STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 * to be set in environment variables.
 *
 * If Stripe is not configured, returns a mock success response
 * so the checkout flow can be tested without real payments.
 */

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { courseId, courseTitle, coursePrice, planId } = body;

    if (!courseId || !courseTitle) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const price = coursePrice || 0;
    const isPlan = courseId.startsWith("plan-");

    // Handle plan subscriptions
    if (isPlan) {
      if (price === 0 || !process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({
          success: true,
          enrolled: true,
          message: "Plano ativado com sucesso!",
        });
      }

      // Stripe checkout for paid plans
      try {
        const stripe = new (await import("stripe").then((m) => m.default))(
          process.env.STRIPE_SECRET_KEY!
        );

        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "brl",
                product_data: {
                  name: courseTitle,
                },
                unit_amount: Math.round(price * 100),
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/planos?success=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/planos?canceled=true`,
          metadata: {
            userId: session.user.id,
            planId: planId || courseId,
          },
        });

        return NextResponse.json({ url: checkoutSession.url });
      } catch (stripeError) {
        logger.error("Stripe error", { error: stripeError instanceof Error ? stripeError.message : String(stripeError) });
        return NextResponse.json(
          { error: "Erro ao processar pagamento do plano" },
          { status: 500 }
        );
      }
    }

    // If course is free or Stripe not configured, enroll directly
    if (price === 0 || !process.env.STRIPE_SECRET_KEY) {
      await db.enrollment.upsert({
        where: {
          userId_courseId: { userId: session.user.id, courseId },
        },
        update: { status: "ACTIVE", enrolledAt: new Date() },
        create: {
          userId: session.user.id,
          courseId,
          status: "ACTIVE",
          enrolledAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        enrolled: true,
        message: "Matrícula realizada com sucesso!",
      });
    }

    // Stripe integration (requires STRIPE_SECRET_KEY)
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new (await import("stripe").then((m) => m.default))(
          process.env.STRIPE_SECRET_KEY!
        );

        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "brl",
                product_data: {
                  name: courseTitle,
                },
                unit_amount: Math.round(price * 100), // Stripe uses cents
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/cursos/${courseId}?checkout=success`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/cursos/${courseId}?checkout=cancel`,
          metadata: {
            userId: session.user.id,
            courseId,
          },
        });

        return NextResponse.json({ url: checkoutSession.url });
      } catch (stripeError) {
        logger.error("Stripe error", { error: stripeError instanceof Error ? stripeError.message : String(stripeError) });
        return NextResponse.json(
          { error: "Erro ao processar pagamento" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      enrolled: false,
      url: null,
      message: "Pagamento não configurado. Configure STRIPE_SECRET_KEY para ativar.",
    });
  } catch (error) {
    logger.error("POST /api/checkout/create-session error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Erro ao criar sessão de checkout" },
      { status: 500 }
    );
  }
}
