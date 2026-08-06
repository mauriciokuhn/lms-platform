import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Call this at the start of any mutation API route (POST, PUT, DELETE)
 * that should be blocked for demo users.
 * Returns a 403 Response to return if blocked, or null if allowed.
 *
 * Example usage:
 * ```ts
 * const demoBlocked = await blockDemoUser();
 * if (demoBlocked) return demoBlocked;
 * ```
 */
export async function blockDemoUser(): Promise<Response | null> {
  const session = await auth();
  if (session?.user?.isDemo) {
    return NextResponse.json(
      { error: "Operação não permitida no modo demonstração. Crie uma conta gratuita para realizar esta ação." },
      { status: 403 }
    );
  }
  return null;
}
