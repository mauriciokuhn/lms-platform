import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, headline, bio } = body;

    await db.user.update({
      where: { id: session.user.id },
      data: { name, headline, bio },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("PUT /api/instructor/profile error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const instructor = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        headline: true,
        bio: true,
      },
    });

    return NextResponse.json(instructor);
  } catch (error) {
    logger.error("GET /api/instructor/profile error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar perfil" }, { status: 500 });
  }
}
