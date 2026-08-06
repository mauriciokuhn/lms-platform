"use client";

import { useState, useRef } from "react";

interface VideoUploadProps {
  value: string;
  onChange: (url: string, type: "youtube" | "vimeo" | "upload" | "") => void;
}

export function VideoUpload({ value, onChange }: VideoUploadProps) {
  const [mode, setMode] = useState<"youtube" | "vimeo" | "upload">(() => {
    if (value?.includes("youtube") || value?.includes("youtu.be")) return "youtube";
    if (value?.includes("vimeo")) return "vimeo";
    return "youtube";
  });
  const [url, setUrl] = useState(value || "");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function getEmbedUrl(input: string, mode: string): string {
    if (!input) return "";
    if (mode === "youtube") {
      const match = input.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
      );
      return match ? `https://www.youtube.com/embed/${match[1]}` : input;
    }
    if (mode === "vimeo") {
      const match = input.match(/vimeo\.com\/(\d+)/);
      return match ? `https://player.vimeo.com/video/${match[1]}` : input;
    }
    return input;
  }

  function handleUrlChange(newUrl: string) {
    setUrl(newUrl);
    const embedUrl = getEmbedUrl(newUrl, mode);
    onChange(embedUrl || newUrl, embedUrl ? mode : "");
  }

  function handleModeChange(newMode: "youtube" | "vimeo" | "upload") {
    setMode(newMode);
    setUrl("");
    onChange("", "");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["youtube", "vimeo", "upload"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              mode === m
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {m === "youtube" ? "YouTube" : m === "vimeo" ? "Vimeo" : "Upload"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith("video/")) {
              // In a real app, upload to S3/cloud storage here
              const objectUrl = URL.createObjectURL(file);
              setUrl(objectUrl);
              onChange(objectUrl, "upload");
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition ${
            dragOver
              ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        >
          <svg className="mb-2 h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Arraste um vídeo aqui ou clique para selecionar
          </p>
          <p className="mt-1 text-xs text-zinc-400">MP4, WebM, MOV. Máx 500MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const objectUrl = URL.createObjectURL(file);
                setUrl(objectUrl);
                onChange(objectUrl, "upload");
              }
            }}
          />
        </div>
      ) : (
        <input
          type="url"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder={
            mode === "youtube"
              ? "https://youtube.com/watch?v=..."
              : "https://vimeo.com/123456789"
          }
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500"
        />
      )}

      {value && (mode === "youtube" || mode === "vimeo") && (
        <div className="aspect-video overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <iframe
            src={value}
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}
    </div>
  );
}
