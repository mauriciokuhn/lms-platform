/**
 * Unit tests for getRoleHome (src/lib/role-home.ts).
 *
 * Maps each user role to its home route: ADMIN → /admin,
 * INSTRUCTOR → /instrutor, everything else → /dashboard.
 */
import { describe, it, expect } from "vitest";
import { getRoleHome } from "@/lib/role-home";

describe("getRoleHome", () => {
  it("returns /admin for ADMIN", () => {
    expect(getRoleHome("ADMIN")).toBe("/admin");
  });

  it("returns /instrutor for INSTRUCTOR", () => {
    expect(getRoleHome("INSTRUCTOR")).toBe("/instrutor");
  });

  it("returns /dashboard for STUDENT", () => {
    expect(getRoleHome("STUDENT")).toBe("/dashboard");
  });

  it("returns /dashboard when role is undefined", () => {
    expect(getRoleHome(undefined)).toBe("/dashboard");
  });

  it("returns /dashboard when role is null", () => {
    expect(getRoleHome(null)).toBe("/dashboard");
  });

  it("returns /dashboard for an unknown role value", () => {
    expect(getRoleHome("SUPERUSER")).toBe("/dashboard");
  });

  it("is case-sensitive (lowercase role falls back to dashboard)", () => {
    expect(getRoleHome("admin")).toBe("/dashboard");
  });
});
