import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/students/[id]/sessions
 *
 * Lists the student's recent login sessions (admin only) so an admin can
 * spot and end sessions remotely.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const student = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
    }

    const logins = await db.loginHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        userAgent: true,
        createdAt: true,
        revokedAt: true,
        sessionTokenHash: true,
      },
    });

    return NextResponse.json({
      student,
      sessions: logins.map((l) => ({
        id: l.id,
        userAgent: l.userAgent,
        createdAt: l.createdAt.toISOString(),
        revoked: l.revokedAt !== null,
        revocable: l.sessionTokenHash !== null && l.revokedAt === null,
      })),
    });
  } catch (error) {
    logger.error("GET /api/admin/students/[id]/sessions error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erro ao buscar sessões" }, { status: 500 });
  }
}
