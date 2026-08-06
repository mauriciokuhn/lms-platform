/**
 * S3 / Cloudflare R2 Upload Utility
 *
 * Uploads files to S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.)
 * Falls back to local uploads when cloud storage is not configured.
 */

import { logger } from "@/lib/logger";

interface UploadOptions {
  /** File buffer or Blob */
  file: Buffer | Blob;
  /** File name (including extension) */
  fileName: string;
  /** MIME type */
  contentType: string;
  /** Optional folder prefix (e.g. "videos", "thumbnails") */
  folder?: string;
}

interface UploadResult {
  url: string;
  key: string;
  size: number;
}

// ─── S3 Configuration ────────────────────

function getS3Config() {
  const endpoint = process.env.S3_ENDPOINT;       // Optional: R2 endpoint, MinIO, etc.
  const region = process.env.S3_REGION || "auto";  // R2 uses "auto"
  const bucket = process.env.S3_BUCKET || "lms-uploads";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const publicUrl = process.env.S3_PUBLIC_URL;     // Optional: custom CDN/public URL

  return { endpoint, region, bucket, accessKeyId, secretAccessKey, publicUrl };
}

// ─── Upload File ─────────────────────────

export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { file, fileName, contentType, folder = "uploads" } = options;
  const config = getS3Config();

  // If S3 credentials are configured, use S3
  if (config.accessKeyId && config.secretAccessKey) {
    return uploadToS3(file, fileName, contentType, folder, config);
  }

  // Fallback: return a local URL (for development)
  return {
    url: `/uploads/${folder}/${fileName}`,
    key: `${folder}/${fileName}`,
    size: file instanceof Buffer ? file.length : (file as Blob).size,
  };
}

// ─── Upload Video ────────────────────────

export async function uploadVideo(
  file: Buffer | Blob,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  return uploadFile({ file, fileName, contentType, folder: "videos" });
}

// ─── Upload Image (Thumbnail) ────────────

export async function uploadImage(
  file: Buffer | Blob,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  return uploadFile({ file, fileName, contentType, folder: "images" });
}

// ─── Upload Document (PDF, etc.) ─────────

export async function uploadDocument(
  file: Buffer | Blob,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  return uploadFile({ file, fileName, contentType, folder: "documents" });
}

// ─── Delete File ─────────────────────────

export async function deleteFile(key: string): Promise<boolean> {
  const config = getS3Config();

  if (!config.accessKeyId || !config.secretAccessKey) {
    return true; // No-op in dev
  }

  try {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");

    const client = new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: !!config.endpoint, // Required for R2/MinIO
    });

    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );

    return true;
  } catch (error) {
    logger.error("S3 delete error", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

// ─── Internal: S3 Upload ─────────────────

async function uploadToS3(
  file: Buffer | Blob,
  fileName: string,
  contentType: string,
  folder: string,
  config: ReturnType<typeof getS3Config>
): Promise<UploadResult> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  // Generate unique key
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${folder}/${timestamp}-${safeName}`;

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint || undefined,
    credentials: {
      accessKeyId: config.accessKeyId!,
      secretAccessKey: config.secretAccessKey!,
    },
    forcePathStyle: !!config.endpoint, // Required for R2/MinIO
  });

  const buffer = file instanceof Buffer ? file : Buffer.from(await (file as Blob).arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Build public URL
  const baseUrl = config.publicUrl || `https://${config.bucket}.${config.region}.amazonaws.com`;
  const url = `${baseUrl}/${key}`;

  return { url, key, size: buffer.length };
}
