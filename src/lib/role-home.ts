/**
 * Maps a user role to its home route.
 *
 * Used by the login/register flows and the auth middleware so every user
 * lands on the right dashboard after signing in (ADMIN → /admin,
 * INSTRUCTOR → /instrutor, everyone else → /dashboard).
 */
export function getRoleHome(role?: string | null): string {
  if (role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instrutor";
  return "/dashboard";
}
