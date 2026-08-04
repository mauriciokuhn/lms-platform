import type { NextAuthConfig } from "next-auth";

// This is a separate config for edge-compatible middleware usage
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.role === "ADMIN";
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      // Redirect logged-in users away from login
      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Admin routes require ADMIN role
      if (isOnAdmin && !isAdmin) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      // Dashboard and other protected routes require login
      if (isOnDashboard && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as any).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id: string; role: string }).id = token.id as string;
        (session.user as { id: string; role: string }).role = token.role as string;
      }
      return session;
    },
  },
  providers: [], // Populated in auth.ts to avoid importing edge-incompatible modules
} satisfies NextAuthConfig;
