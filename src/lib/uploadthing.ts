import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Route for course thumbnails
  courseThumbnail: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || session.user.role !== "ADMIN") throw new Error("Não autorizado");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      logger.info("Thumbnail uploaded", { userId: metadata.userId, url: file.url });
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Route for lesson materials (PDFs)
  lessonMaterial: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    video: { maxFileSize: "256MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user || session.user.role !== "ADMIN") throw new Error("Não autorizado");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      logger.info("Material uploaded", { userId: metadata.userId, url: file.url });
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
