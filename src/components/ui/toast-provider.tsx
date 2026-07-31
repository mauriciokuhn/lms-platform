"use client";

import { Toaster as SonnerToaster } from "sonner";

export function ToastProvider() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: "white",
          border: "1px solid #e4e4e7",
          borderRadius: "0.75rem",
          padding: "12px 16px",
          fontSize: "14px",
        },
      }}
      closeButton
      richColors
    />
  );
}
