/**
 * Route-level tests for POST /api/upload.
 *
 * Covers the role guard (ADMIN/INSTRUCTOR only), missing file, oversized
 * file (size mocked via defineProperty to avoid allocating 500MB) and the
 * successful path with `@/lib/upload.uploadFile` mocked.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let formDataSpy: ReturnType<typeof vi.spyOn> | null = null;

const authMock = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => authMock);

const uploadFileMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/upload", () => ({ uploadFile: uploadFileMock }));

import { POST } from "@/app/api/upload/route";
import { createMockSession } from "../setup";

function postWithFile(file: File | null, folder?: string) {
  const form = new FormData();
  if (file) form.set("file", file);
  if (folder) form.set("folder", folder);
  return POST(
    new Request("http://localhost/api/upload", { method: "POST", body: form })
  );
}

function makeFile(name: string, content: string, type = "application/pdf") {
  return new File([content], name, { type });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    uploadFileMock.mockReset();
  });

  afterEach(() => {
    formDataSpy?.mockRestore();
    formDataSpy = null;
  });

  it("returns 401 when not authenticated", async () => {
    authMock.auth.mockResolvedValue(null);
    const res = await postWithFile(makeFile("a.pdf", "x"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for STUDENT role", async () => {
    authMock.auth.mockResolvedValue(createMockSession({ id: "s1", role: "STUDENT" }));
    const res = await postWithFile(makeFile("a.pdf", "x"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is sent", async () => {
    authMock.auth.mockResolvedValue(createMockSession({ id: "a1", role: "ADMIN" }));
    const res = await postWithFile(null);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Arquivo não enviado");
  });

  it("returns 400 for files larger than 500MB", async () => {
    authMock.auth.mockResolvedValue(createMockSession({ id: "a2", role: "ADMIN" }));
    const big = makeFile("big.mp4", "x", "video/mp4");
    // Shadow the size getter without allocating half a gigabyte.
    Object.defineProperty(big, "size", { value: 500 * 1024 * 1024 + 1 });

    // Avoid the multipart round-trip (it would rebuild the File from the
    // 1-byte body, losing the size) — return the crafted FormData directly.
    const form = new FormData();
    form.set("file", big);
    formDataSpy = vi
      .spyOn(Request.prototype, "formData")
      .mockResolvedValue(form as unknown as FormData);

    const res = await POST(
      new Request("http://localhost/api/upload", { method: "POST", body: "" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("500MB");
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it("uploads a file and returns the result with 201", async () => {
    authMock.auth.mockResolvedValue(createMockSession({ id: "i1", role: "INSTRUCTOR" }));
    uploadFileMock.mockResolvedValue({ url: "https://cdn.lms.com/aulas/a.pdf", name: "a.pdf" });

    const res = await postWithFile(makeFile("a.pdf", "hello"));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.url).toBe("https://cdn.lms.com/aulas/a.pdf");

    const [args] = uploadFileMock.mock.calls[0];
    expect(args.fileName).toBe("a.pdf");
    expect(args.contentType).toBe("application/pdf");
    expect(args.folder).toBe("uploads"); // default folder
    expect(Buffer.isBuffer(args.file)).toBe(true);
  });

  it("honours a custom folder", async () => {
    authMock.auth.mockResolvedValue(createMockSession({ id: "i2", role: "INSTRUCTOR" }));
    uploadFileMock.mockResolvedValue({ url: "https://cdn.lms.com/x/v.mp4" });

    const res = await postWithFile(makeFile("v.mp4", "x", "video/mp4"), "videos");
    expect(res.status).toBe(201);

    const [args] = uploadFileMock.mock.calls[0];
    expect(args.folder).toBe("videos");
  });
});
