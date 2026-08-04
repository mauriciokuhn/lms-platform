import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const certificate = await db.certificate.findUnique({
      where: { certificateCode: code },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { id: true, title: true, category: true } },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { valid: false, error: "Certificado não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      certificate: {
        code: certificate.certificateCode,
        studentName: certificate.user.name || certificate.user.email,
        courseTitle: certificate.course.title,
        courseCategory: certificate.course.category,
        issuedAt: certificate.issuedAt.toISOString(),
        issuedAtFormatted: certificate.issuedAt.toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      },
    });
  } catch (error) {
    logger.error("GET /api/certificates/verify/[code] error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { valid: false, error: "Erro ao verificar certificado" },
      { status: 500 }
    );
  }
}
