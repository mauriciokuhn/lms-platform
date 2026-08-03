import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { authLimiter } from "@/lib/rate-limit";

const { GET, POST: nextAuthPOST } = handlers;

/**
 * Rate-limited POST handler.
 *
 * Protege o login por credenciais contra força bruta (10 tentativas/min por IP).
 * Fluxos OAuth (Google) passam por /callback/google e não são afetados.
 */
export async function POST(request: NextRequest) {
  if (request.nextUrl.pathname.endsWith("/callback/credentials")) {
    const result = authLimiter.check(request);
    if (!result.allowed) {
      return NextResponse.json(
        { error: result.error },
        { status: 429, headers: result.headers }
      );
    }
  }
  return nextAuthPOST(request);
}

export { GET };
