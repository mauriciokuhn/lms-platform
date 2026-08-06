import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: [
    // Protected routes
    "/admin/:path*",
    "/dashboard/:path*",
    "/instrutor/:path*",
    "/perfil/:path*",
    "/configuracoes/:path*",
    "/meus-cursos/:path*",
    "/certificados/:path*",
    // Redirect logged-in users away from login
    "/login",
    "/register",
  ],
};
