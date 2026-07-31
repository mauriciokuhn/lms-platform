"use client";

import { useState } from "react";
import { generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

const UploadDropzone = generateUploadDropzone<OurFileRouter>();

interface UploadDropzoneProps {
  endpoint: "courseThumbnail" | "lessonMaterial";
  onUploadComplete: (url: string) => void;
  label?: string;
}

export function FileUpload({ endpoint, onUploadComplete, label }: UploadDropzoneProps) {
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      )}
      <UploadDropzone
        endpoint={endpoint}
        onClientUploadComplete={(res) => {
          if (res?.[0]?.url) {
            setUploadedUrl(res[0].url);
            onUploadComplete(res[0].url);
          }
        }}
        onUploadError={(error: Error) => {
          console.error("Upload error:", error);
        }}
        appearance={{
          container: {
            border: "2px dashed #e4e4e7",
            borderRadius: "0.75rem",
            background: "transparent",
          },
          label: {
            color: "#a1a1aa",
          },
          allowedContent: {
            color: "#a1a1aa",
          },
        }}
      />
      {uploadedUrl && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Upload concluído!
          <button
            type="button"
            onClick={() => setUploadedUrl(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
