import type { NextAuthConfig } from "next-auth";
import { getRoleHome } from "./role-home";

// This is a separate config for edge-compatible middleware usage
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const role = auth?.user?.role as string | undefined;
      const isLoggedIn = !!auth?.user;
      const isAdmin = role === "ADMIN";
      const isInstructor = role === "INSTRUCTOR";
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnInstructor = nextUrl.pathname.startsWith("/instrutor");
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      const isOnRegister = nextUrl.pathname.startsWith("/register");

      // Redirect logged-in users away from auth pages, to their role home
      if ((isOnLogin || isOnRegister) && isLoggedIn) {
        return Response.redirect(new URL(getRoleHome(role), nextUrl));
      }

      // Admin routes require ADMIN role
      if (isOnAdmin && !isAdmin) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      // Instructor routes require INSTRUCTOR role (admin uses /admin)
      if (isOnInstructor && !isInstructor) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      // Dashboard requires login; admins are sent to the admin home.
      // (Instructors stay: the instructor layout links back to /dashboard.)
      if (isOnDashboard) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/login", nextUrl));
        }
        if (isAdmin) {
          return Response.redirect(new URL("/admin", nextUrl));
        }
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
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
