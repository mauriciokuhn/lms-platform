import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const certificates = await db.certificate.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });

    const formatted = certificates.map((cert) => ({
      id: cert.id,
      certificateCode: cert.certificateCode,
      course: cert.course,
      issuedAt: cert.issuedAt.toISOString(),
      issuedAtFormatted: cert.issuedAt.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    logger.error("GET /api/certificates error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Erro ao buscar certificados" }, { status: 500 });
  }
}
