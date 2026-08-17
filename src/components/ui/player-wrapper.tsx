"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface PlayerWrapperProps {
  url: string;
  onProgress?: (watchedSeconds: number) => void;
  onComplete?: () => void;
  initialSeconds?: number;
  className?: string;
}

/**
 * Video player with a single, theme-consistent control bar.
 *
 * - HTML5 video: custom play/pause + seek + speed (the browser's native
 *   `controls` are NOT rendered — they would duplicate this bar).
 * - YouTube: the IFrame widget API over postMessage tracks play state and
 *   emits real currentTime progress; `initialSeconds` resumes via the
 *   `start` embed parameter.
 */
export function PlayerWrapper({
  url,
  onProgress,
  onComplete,
  initialSeconds = 0,
  className = "",
}: PlayerWrapperProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const widgetIdRef = useRef(1);
  const lastProgressSentRef = useRef(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seeking, setSeeking] = useState(false);

  const isYouTube = url.includes("youtube") || url.includes("youtu.be");

  // Send a command to the YouTube iframe (IFrame widget API over postMessage).
  const postToYouTube = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func,
        args,
        id: widgetIdRef.current,
        channel: "widget",
      }),
      "*"
    );
  }, []);

  // Emit progress at most every 15s (matches the server save cadence).
  const emitProgress = useCallback(
    (seconds: number) => {
      if (!onProgress) return;
      const now = Date.now();
      if (now - lastProgressSentRef.current >= 15000 || seconds === 0) {
        lastProgressSentRef.current = now;
        onProgress(Math.floor(seconds));
      }
    },
    [onProgress]
  );

  // YouTube: listen for player state + currentTime info deliveries.
  useEffect(() => {
    if (!isYouTube) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      let data: { event?: string; info?: unknown; id?: number };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      // Only react to our widget (or the un-scoped onStateChange events).
      if (data.id !== widgetIdRef.current && data.event !== "onStateChange") return;

      if (data.event === "onStateChange") {
        // 1=playing, 2=paused, 3=buffering, 0=ended
        const state = data.info as number;
        if (state === 1) {
          setIsPlaying(true);
          // Grab the real position right away so progress reflects playback.
          postToYouTube("getCurrentTime");
        } else if (state === 2 || state === 3) {
          setIsPlaying(false);
        } else if (state === 0) {
          setIsPlaying(false);
          onComplete?.();
        }
      } else if (data.event === "infoDelivery" && data.info) {
        const info = data.info as { currentTime?: number; duration?: number };
        if (typeof info.currentTime === "number") {
          setCurrentTime(info.currentTime);
          emitProgress(info.currentTime);
        }
        if (typeof info.duration === "number" && info.duration > 0) {
          setDuration(info.duration);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    // Announce that we're listening — required for the widget API handshake.
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "listening", id: widgetIdRef.current, channel: "widget" }),
      "*"
    );
    return () => window.removeEventListener("message", handleMessage);
  }, [isYouTube, onComplete, postToYouTube, emitProgress]);

  // YouTube: poll currentTime every 15s while playing.
  useEffect(() => {
    if (!isYouTube || !isPlaying) return;
    const interval = setInterval(() => postToYouTube("getCurrentTime"), 15000);
    return () => clearInterval(interval);
  }, [isYouTube, isPlaying, postToYouTube]);

  // HTML5: emit progress every 15s while playing.
  useEffect(() => {
    if (!isPlaying || isYouTube) return;
    const interval = setInterval(() => {
      if (videoRef.current) {
        emitProgress(videoRef.current.currentTime);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isPlaying, isYouTube, emitProgress]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current && !seeking) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  }, [seeking]);

  const handleVideoEnded = useCallback(() => {
    onComplete?.();
    if (videoRef.current) {
      emitProgress(Math.floor(videoRef.current.currentTime));
    }
  }, [onComplete, emitProgress]);

  const handlePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
    } else {
      v.pause();
    }
  }, []);

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

  // YouTube embed (IFrame widget API + `start` param to resume).
  if (isYouTube) {
    const youtubeUrl = url.includes("embed")
      ? url
      : url.replace("watch?v=", "embed/").split("&")[0];

    const params = new URLSearchParams();
    params.set("enablejsapi", "1");
    params.set("rel", "0");
    const start = Math.floor(initialSeconds);
    if (start > 0) params.set("start", String(start));
    const sep = youtubeUrl.includes("?") ? "&" : "?";
    const ytUrl = youtubeUrl + sep + params.toString();

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

  // HTML5 video with a single custom control bar.
  return (
    <div className={`${className}`}>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          src={url}
          className="h-full w-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            const v = videoRef.current;
            if (!v) return;
            setDuration(v.duration || 0);
            if (
              initialSeconds > 0 &&
              isFinite(initialSeconds) &&
              initialSeconds < (v.duration || Infinity)
            ) {
              v.currentTime = initialSeconds;
              setCurrentTime(initialSeconds);
            }
          }}
          onEnded={handleVideoEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        {/* Center play/pause overlay (native controls are disabled). */}
        <button
          type="button"
          onClick={handlePlayPause}
          aria-label={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
          className="absolute inset-0 flex items-center justify-center"
        >
          {!isPlaying && (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70">
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          )}
        </button>
      </div>

      {/* Controls Bar */}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={handlePlayPause}
          aria-label={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          {isPlaying ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Seek Bar */}
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={1}
            value={Math.min(currentTime, duration || currentTime)}
            onChange={handleSeekChange}
            onMouseDown={() => setSeeking(true)}
            onMouseUp={() => setSeeking(false)}
            onTouchStart={() => setSeeking(true)}
            onTouchEnd={() => setSeeking(false)}
            aria-label="Posição do vídeo"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-900 dark:bg-zinc-700 dark:accent-white"
          />
        </div>

        {/* Time Display */}
        <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Speed Control */}
        <div className="flex items-center gap-1">
          {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => {
                setPlaybackRate(rate);
                if (videoRef.current) videoRef.current.playbackRate = rate;
              }}
              className={`rounded px-2 py-0.5 text-xs font-medium transition ${
                playbackRate === rate
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
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
