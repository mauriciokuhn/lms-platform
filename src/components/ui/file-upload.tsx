"use client";

import { UploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { useState } from "react";

interface FileUploadProps {
  endpoint: keyof OurFileRouter;
  onUploadComplete: (url: string) => void;
  label?: string;
}

export function FileUpload({ endpoint, onUploadComplete, label }: FileUploadProps) {
  const [uploaded, setUploaded] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <p className="mb-2 text-sm font-medium text-zinc-700">{label}</p>
      )}
      {uploaded ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Arquivo enviado com sucesso!
        </div>
      ) : (
        <UploadDropzone<OurFileRouter, (typeof endpoint)>
          endpoint={endpoint}
          onClientUploadComplete={(res) => {
            if (res?.[0]?.url) {
              onUploadComplete(res[0].url);
              setUploaded(true);
            }
          }}
          onUploadError={(error: Error) => {
            alert(`Upload failed: ${error.message}`);
          }}
          appearance={{
            container: {
              borderColor: "#e4e4e7",
              borderRadius: "0.75rem",
              background: "#fafafa",
            },
            allowedContent: { color: "#a1a1aa", fontSize: "0.75rem" },
          }}
        />
      )}
    </div>
  );
}
