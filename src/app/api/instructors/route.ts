import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const instructors = await db.user.findMany({
      where: { role: "INSTRUCTOR" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        headline: true,
        bio: true,
        _count: { select: { courses: true } },
      },
    });

    const formatted = instructors.map((inst) => ({
      id: inst.id,
      name: inst.name,
      email: inst.email,
      image: inst.image,
      headline: inst.headline,
      bio: inst.bio,
      coursesCount: inst._count.courses,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    logger.error("GET /api/instructors error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar instrutores" }, { status: 500 });
  }
}
