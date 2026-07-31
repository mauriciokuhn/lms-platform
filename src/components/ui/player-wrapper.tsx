"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface PlayerWrapperProps {
  url: string;
  onProgress?: (watchedSeconds: number) => void;
  onComplete?: () => void;
  initialSeconds?: number;
  className?: string;
}

export function PlayerWrapper({
  url,
  onProgress,
  onComplete,
  className = "",
}: PlayerWrapperProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const isYouTube = url.includes("youtube") || url.includes("youtu.be");

  // YouTube postMessage listener (always called - hooks rules)
  useEffect(() => {
    if (!isYouTube || !iframeRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = JSON.parse(event.data);
        if (data.event === "onStateChange" && data.info === 0) {
          onComplete?.();
        }
      } catch {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isYouTube, onComplete]);

  // Emit progress every 15 seconds
  useEffect(() => {
    if (!isPlaying || isYouTube) return;

    progressInterval.current = setInterval(() => {
      if (videoRef.current) {
        const ct = Math.floor(videoRef.current.currentTime);
        onProgress?.(ct);
      }
    }, 15000);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying, isYouTube, onProgress]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !seeking) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  }, [seeking]);

  const handleVideoEnded = useCallback(() => {
    onComplete?.();
    if (videoRef.current) {
      onProgress?.(Math.floor(videoRef.current.currentTime));
    }
  }, [onComplete, onProgress]);

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  }, []);

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // YouTube embed with postMessage API for end detection
  if (isYouTube) {
    const youtubeUrl = url.includes("embed")
      ? url
      : url.replace("watch?v=", "embed/").split("&")[0];

    // Enable YT iframe API by adding enablejsapi=1
    const ytUrl = youtubeUrl + (youtubeUrl.includes("?") ? "&" : "?") + "enablejsapi=1";

    return (
      <div className={`${className}`}>
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            ref={iframeRef}
            src={ytUrl}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // HTML5 Video with controls
  return (
    <div className={`${className}`}>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          src={url}
          className="h-full w-full"
          controls
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration || 0);
          }}
          onEnded={handleVideoEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      {/* Controls Bar */}
      <div className="mt-2 flex items-center gap-3">
        {/* Seek Bar */}
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={1}
            value={currentTime}
            onChange={handleSeekChange}
            onMouseDown={() => setSeeking(true)}
            onMouseUp={() => setSeeking(false)}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-white"
          />
        </div>

        {/* Time Display */}
        <span className="whitespace-nowrap text-xs text-zinc-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Speed Control */}
        <div className="flex items-center gap-1">
          {[0.5, 1, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => {
                setPlaybackRate(rate);
                if (videoRef.current) videoRef.current.playbackRate = rate;
              }}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                playbackRate === rate
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
