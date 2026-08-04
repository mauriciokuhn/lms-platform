/**
 * Unit tests for src/lib/upload.ts.
 *
 * Covers the local fallback path (no S3 credentials) and the S3 path with
 * the `@aws-sdk/client-s3` module mocked — no real storage involved.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  uploadFile,
  uploadVideo,
  uploadImage,
  uploadDocument,
  deleteFile,
} from "@/lib/upload";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ type: "PUT", input })),
  DeleteObjectCommand: vi.fn().mockImplementation((input: unknown) => ({ type: "DELETE", input })),
}));

// ── Local fallback (no S3 credentials) ───────────────────────────────────

describe("upload — local fallback", () => {
  beforeEach(() => {
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
  });

  it("returns a local URL with the default folder", async () => {
    const result = await uploadFile({
      file: Buffer.from("hello"),
      fileName: "doc.pdf",
      contentType: "application/pdf",
    });

    expect(result.url).toBe("/uploads/uploads/doc.pdf");
    expect(result.key).toBe("uploads/doc.pdf");
    expect(result.size).toBe(5);
  });

  it("respects a custom folder", async () => {
    const result = await uploadFile({
      file: Buffer.from("x"),
      fileName: "a.png",
      contentType: "image/png",
      folder: "images",
    });

    expect(result.url).toBe("/uploads/images/a.png");
    expect(result.key).toBe("images/a.png");
  });

  it("sizes Blob files correctly", async () => {
    const blob = new Blob(["hello"]);
    const result = await uploadFile({
      file: blob,
      fileName: "b.txt",
      contentType: "text/plain",
    });

    expect(result.size).toBe(5);
  });

  it("uploadVideo routes to the videos folder", async () => {
    const result = await uploadVideo(Buffer.from("x"), "v.mp4", "video/mp4");
    expect(result.key).toBe("videos/v.mp4");
  });

  it("uploadImage routes to the images folder", async () => {
    const result = await uploadImage(Buffer.from("x"), "thumb.jpg", "image/jpeg");
    expect(result.key).toBe("images/thumb.jpg");
  });

  it("uploadDocument routes to the documents folder", async () => {
    const result = await uploadDocument(Buffer.from("x"), "material.pdf", "application/pdf");
    expect(result.key).toBe("documents/material.pdf");
  });

  it("deleteFile is a no-op without S3 credentials", async () => {
    expect(await deleteFile("uploads/doc.pdf")).toBe(true);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

// ── S3 path (mocked @aws-sdk/client-s3) ──────────────────────────────────

describe("upload — S3 path", () => {
  beforeEach(() => {
    process.env.S3_ACCESS_KEY_ID = "access-key";
    process.env.S3_SECRET_ACCESS_KEY = "secret-key";
    process.env.S3_BUCKET = "lms-uploads";
    process.env.S3_REGION = "auto";
    sendMock.mockReset();
    sendMock.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.S3_PUBLIC_URL;
  });

  it("uploads via S3 and builds the public URL", async () => {
    const result = await uploadFile({
      file: Buffer.from("hello"),
      fileName: "doc.pdf",
      contentType: "application/pdf",
    });

    expect(result.url).toMatch(/^https:\/\/lms-uploads\.auto\.amazonaws\.com\/uploads\/\d+-doc\.pdf$/);
    expect(result.size).toBe(5);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("sanitizes unsafe characters in the file name", async () => {
    const result = await uploadFile({
      file: Buffer.from("x"),
      fileName: "my file (2).pdf",
      contentType: "application/pdf",
    });

    // "my file (2).pdf" → space and both parens become "_" (double
    // underscore where they are consecutive).
    expect(result.key).toMatch(/^uploads\/\d+-my_file__2_.pdf$/);
  });

  it("uses S3_PUBLIC_URL when provided", async () => {
    process.env.S3_PUBLIC_URL = "https://cdn.example.com";
    const result = await uploadFile({
      file: Buffer.from("x"),
      fileName: "a.png",
      contentType: "image/png",
      folder: "images",
    });

    expect(result.url).toContain("https://cdn.example.com/images/");
  });

  it("converts Blob files to a Buffer before uploading", async () => {
    const blob = new Blob(["hello"]);
    const result = await uploadFile({
      file: blob,
      fileName: "b.txt",
      contentType: "text/plain",
    });

    expect(result.size).toBe(5);
    const [command] = sendMock.mock.calls[0];
    expect(command.input.Body).toBeInstanceOf(Buffer);
  });

  it("deleteFile sends a DeleteObjectCommand", async () => {
    expect(await deleteFile("uploads/doc.pdf")).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("deleteFile returns false when the S3 call throws", async () => {
    sendMock.mockRejectedValue(new Error("boom"));
    expect(await deleteFile("uploads/doc.pdf")).toBe(false);
  });
});
