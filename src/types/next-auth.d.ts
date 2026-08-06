import "next-auth";
import "next-auth/jwt";

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      plan: "FREE" | "PRO" | "ENTERPRISE";
      isDemo?: boolean;
    };
  }

  interface User {
    role: string;
    plan: "FREE" | "PRO" | "ENTERPRISE";
    isDemo?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    plan: "FREE" | "PRO" | "ENTERPRISE";
    isDemo?: boolean;
  }
}
