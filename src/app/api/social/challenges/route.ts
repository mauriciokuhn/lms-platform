import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cache } from "@/lib/cache";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

    const challenges = await cache.getOrSet(
      "social:challenges:active",
      async () => {
        const now = new Date();

        // Get active challenges
        const active = await db.challenge.findMany({
          where: {
            status: "ACTIVE",
            endsAt: { gte: now },
            startsAt: { lte: now },
          },
          include: {
            participants: {
              select: {
                id: true,
                userId: true,
                progress: true,
                completed: true,
              },
            },
            _count: { select: { participants: true } },
          },
          orderBy: { endsAt: "asc" },
          take: 10,
        });

        return active;
      },
      30 // cache for 30 seconds
    );

    // Get past challenges (completed by this user)
    const pastChallenges = await db.challengeParticipant.findMany({
      where: { userId, completed: true },
      include: {
        challenge: {
          select: { id: true, title: true, description: true, xpReward: true },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      active: challenges.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        goalType: c.goalType,
        goalValue: c.goalValue,
        xpReward: c.xpReward,
        badgeReward: c.badgeReward,
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
        participantsCount: c._count.participants,
        myProgress: c.participants.find((p) => p.userId === userId)?.progress || 0,
        myCompleted: c.participants.find((p) => p.userId === userId)?.completed || false,
      })),
      past: pastChallenges.map((p) => ({
        id: p.id,
        challengeId: p.challenge.id,
        title: p.challenge.title,
        description: p.challenge.description,
        xpReward: p.challenge.xpReward,
        completedAt: p.completedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/social/challenges error:", error);
    return NextResponse.json({ error: "Erro ao buscar desafios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { challengeId } = await request.json();

    if (!challengeId) {
      return NextResponse.json({ error: "ID do desafio é obrigatório" }, { status: 400 });
    }

    // Check if challenge exists and is active
    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.status !== "ACTIVE") {
      return NextResponse.json({ error: "Desafio não encontrado ou não está ativo" }, { status: 400 });
    }

    // Check if already joined
    const existing = await db.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId: session.user.id } },
    });

    if (existing) {
      return NextResponse.json({ error: "Você já participa deste desafio" }, { status: 400 });
    }

    // Join challenge
    await db.challengeParticipant.create({
      data: {
        challengeId,
        userId: session.user.id,
        progress: 0,
      },
    });

    await cache.invalidate("social:challenges:*");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/social/challenges error:", error);
    return NextResponse.json({ error: "Erro ao entrar no desafio" }, { status: 500 });
  }
}
