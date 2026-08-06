/**
 * Unit tests for the uploadthing FileRouter (src/lib/uploadthing.ts).
 *
 * The `uploadthing/next` builder is mocked with a chainable stub so the
 * real middleware/onUploadComplete callbacks can be invoked directly.
 * Covers the ADMIN-only guard and the completion metadata for both routes.
 */
import { describe, it, expect, vi } from "vitest";

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

vi.mock("uploadthing/next", () => ({
  createUploadthing: () => (config: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const route: any = { config }; // keep config referenced for lint
    return {
      middleware: (fn: unknown) => {
        route.middleware = fn;
        return {
          onUploadComplete: (fn2: unknown) => {
            route.onUploadComplete = fn2;
            return route;
          },
        };
      },
    };
  },
}));

import { ourFileRouter } from "@/lib/uploadthing";
import { createMockSession } from "../setup";

interface RouteCallbacks {
  middleware: () => Promise<{ userId: string }>;
  onUploadComplete: (opts: {
    metadata: { userId: string };
    file: { url: string };
  }) => unknown;
}

const thumbnail = ourFileRouter.courseThumbnail as unknown as RouteCallbacks;
const material = ourFileRouter.lessonMaterial as unknown as RouteCallbacks;

describe("uploadthing FileRouter", () => {
  it("courseThumbnail middleware allows ADMINs and returns the userId", async () => {
    authMock.auth.mockResolvedValue(createMockSession({ id: "a1", role: "ADMIN" }));

    const meta = await thumbnail.middleware();
    expect(meta).toEqual({ userId: "a1" });
  });

  it("courseThumbnail middleware rejects students", async () => {
    authMock.auth.mockResolvedValue(createMockSession({ id: "s1", role: "STUDENT" }));

    await expect(thumbnail.middleware()).rejects.toThrow("Não autorizado");
  });

  it("courseThumbnail middleware rejects unauthenticated calls", async () => {
    authMock.auth.mockResolvedValue(null);

    await expect(thumbnail.middleware()).rejects.toThrow("Não autorizado");
  });

  it("lessonMaterial middleware also requires ADMIN", async () => {
    authMock.auth.mockResolvedValue(createMockSession({ id: "a2", role: "ADMIN" }));
    expect(await material.middleware()).toEqual({ userId: "a2" });

    authMock.auth.mockResolvedValue(createMockSession({ id: "s2", role: "STUDENT" }));
    await expect(material.middleware()).rejects.toThrow("Não autorizado");
  });

  it("courseThumbnail onUploadComplete returns the uploader and url", async () => {
    const result = await thumbnail.onUploadComplete({
      metadata: { userId: "a1" },
      file: { url: "https://utfs.io/f/thumb-1" },
    });

    expect(result).toEqual({ uploadedBy: "a1", url: "https://utfs.io/f/thumb-1" });
  });

  it("lessonMaterial onUploadComplete returns the uploader and url", async () => {
    const result = await material.onUploadComplete({
      metadata: { userId: "a2" },
      file: { url: "https://utfs.io/f/lesson-1.pdf" },
    });

    expect(result).toEqual({ uploadedBy: "a2", url: "https://utfs.io/f/lesson-1.pdf" });
  });
});
