import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getLoginFailureCount } from "@/lib/rate-limit";
import { issueLoginChallenge, CHALLENGE_THRESHOLD } from "@/lib/login-challenge";

/**
 * GET /api/auth/challenge?email=...
 *
 * Tells the login page whether the anti-bot challenge is required for this
 * account (≥ CHALLENGE_THRESHOLD consecutive failures) and, when it is,
 * issues a fresh one-time challenge. Never reveals the answer.
 */
export async function GET(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return NextResponse.json({ required: false });
  }

  const failures = await getLoginFailureCount(email);
  if (failures < CHALLENGE_THRESHOLD) {
    return NextResponse.json({ required: false, failures });
  }

  const { token, question } = await issueLoginChallenge(email);
  return NextResponse.json({ required: true, failures, token, question });
}
