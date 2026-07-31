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

    const clans = await cache.getOrSet(
      "social:clans:ranking",
      async () => {
        return db.clan.findMany({
          include: {
            _count: { select: { members: true } },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, image: true },
                },
              },
            },
          },
          orderBy: { xp: "desc" },
          take: 20,
        });
      },
      60
    );

    return NextResponse.json({
      clans: clans.map((c, i) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        xp: c.xp,
        level: c.level,
        membersCount: c._count.members,
        members: c.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          name: m.user.name || "Aluno",
          image: m.user.image,
          role: m.role,
        })),
        rank: i + 1,
      })),
    });
  } catch (error) {
    console.error("GET /api/social/clans error:", error);
    return NextResponse.json({ error: "Erro ao buscar clans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { action, clanId, name, description, icon } = await request.json();

    if (action === "create") {
      if (!name) {
        return NextResponse.json({ error: "Nome do clan é obrigatório" }, { status: 400 });
      }

      // Check if name is taken
      const existing = await db.clan.findUnique({ where: { name } });
      if (existing) {
        return NextResponse.json({ error: "Já existe um clan com este nome" }, { status: 400 });
      }

      const clan = await db.clan.create({
        data: {
          name,
          description: description || null,
          icon: icon || "🏰",
          members: {
            create: {
              userId: session.user.id,
              role: "LEADER",
            },
          },
        },
      });

      await cache.invalidate("social:clans:*");

      return NextResponse.json(clan, { status: 201 });
    }

    if (action === "join") {
      if (!clanId) {
        return NextResponse.json({ error: "ID do clan é obrigatório" }, { status: 400 });
      }

      // Check if already in a clan
      const existing = await db.clanMember.findFirst({
        where: { userId: session.user.id },
      });
      if (existing) {
        return NextResponse.json({ error: "Você já está em um clan" }, { status: 400 });
      }

      const member = await db.clanMember.create({
        data: {
          clanId,
          userId: session.user.id,
          role: "MEMBER",
        },
      });

      await cache.invalidate("social:clans:*");

      return NextResponse.json(member, { status: 201 });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/social/clans error:", error);
    return NextResponse.json({ error: "Erro ao processar ação" }, { status: 500 });
  }
}
