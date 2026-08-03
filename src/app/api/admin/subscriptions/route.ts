import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Summary stats
    const [totalUsers, proUsers, enterpriseUsers, activeSubscriptions, recentSubscriptions] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { plan: "PRO" } }),
      db.user.count({ where: { plan: "ENTERPRISE" } }),
      db.subscription.count({ where: { status: "active" } }),
      db.subscription.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true, image: true } },
        },
      }),
    ]);

    // Monthly subscription growth (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const subscriptions = await db.subscription.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true, plan: true },
    });

    const monthlyMap = new Map<string, { pro: number; enterprise: number }>();
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, { pro: 0, enterprise: 0 });
    }

    subscriptions.forEach((sub) => {
      const key = `${sub.createdAt.getFullYear()}-${String(sub.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap.has(key)) {
        const entry = monthlyMap.get(key)!;
        if (sub.plan === "PRO") entry.pro++;
        else if (sub.plan === "ENTERPRISE") entry.enterprise++;
      }
    });

    const monthlyGrowth = Array.from(monthlyMap.entries())
      .map(([month, counts]) => ({
        month,
        pro: counts.pro,
        enterprise: counts.enterprise,
        total: counts.pro + counts.enterprise,
      }))
      .reverse();

    // Revenue projection (mock — real Stripe revenue would need Stripe API)
    const monthlyRevenue = monthlyGrowth.map((m) => ({
      month: m.month,
      revenue: m.pro * 29.9 + m.enterprise * 99.9,
      subscribers: m.total,
    }));

    const currentRevenue = monthlyRevenue[monthlyRevenue.length - 1]?.revenue || 0;
    const previousRevenue = monthlyRevenue[monthlyRevenue.length - 2]?.revenue || 0;
    const revenueGrowth = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;

    return NextResponse.json({
      summary: {
        totalUsers,
        proUsers,
        enterpriseUsers,
        freeUsers: totalUsers - proUsers - enterpriseUsers,
        proPercentage: totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0,
        enterprisePercentage: totalUsers > 0 ? Math.round((enterpriseUsers / totalUsers) * 100) : 0,
        activeSubscriptions,
        monthlyRevenue: Math.round(currentRevenue * 100) / 100,
        revenueGrowth,
      },
      monthlyGrowth,
      monthlyRevenue,
      recentSubscriptions: recentSubscriptions.map((s) => ({
        id: s.id,
        userName: s.user.name || s.user.email,
        userEmail: s.user.email,
        plan: s.plan,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        currentPeriodEnd: s.currentPeriodEnd?.toISOString() || null,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/subscriptions error:", error);
    return NextResponse.json({ error: "Erro ao carregar assinaturas" }, { status: 500 });
  }
}
