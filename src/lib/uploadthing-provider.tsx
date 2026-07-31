"use client";

import { ReactNode } from "react";

// UploadThing client-side provider
// In production, this would wrap with UploadThing's extractor
// For now, the UploadDropzone from @uploadthing/react handles its own state
export function UploadThingProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
