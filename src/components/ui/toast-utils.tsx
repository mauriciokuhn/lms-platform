"use client";

import { toast } from "sonner";

export function showSuccess(message: string, description?: string) {
  toast.success(message, { description });
}

export function showError(message: string, description?: string) {
  toast.error(message, { description, duration: 5000 });
}

export function showInfo(message: string, description?: string) {
  toast.info(message, { description });
}
