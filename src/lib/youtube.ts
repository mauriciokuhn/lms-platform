/**
 * YouTube Data API v3 Integration
 *
 * Provides utilities to fetch video metadata from YouTube:
 * - Video details (title, duration, thumbnail)
 * - Channel/author info
 * - Search for videos
 *
 * Uses the public YouTube embedded player by default (no API key required).
 * When YOUTUBE_API_KEY is set, fetches rich metadata from the Data API.
 *
 * Required env vars:
 * - NEXT_PUBLIC_YOUTUBE_API_KEY (optional, for Data API features)
 */

import { z } from "zod";
import { logger } from "@/lib/logger";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  channelTitle: string;
  channelId: string;
  embedUrl: string;
}

export interface YouTubeSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  duration: number;
}

// ──────────────────────────────────────────
// Extract YouTube Video ID from URL
// ──────────────────────────────────────────

const YOUTUBE_URL_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_URL_REGEX);
  return match ? match[1] : null;
}

export function getEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

export function getWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// ──────────────────────────────────────────
// Parse ISO 8601 Duration to seconds
// ──────────────────────────────────────────

export function parseISODuration(duration: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// ──────────────────────────────────────────
// Fetch video info from YouTube Data API
// ──────────────────────────────────────────

const videoInfoSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z.object({
        title: z.string(),
        description: z.string(),
        thumbnails: z.object({
          high: z.object({ url: z.string() }).optional(),
          medium: z.object({ url: z.string() }).optional(),
          default: z.object({ url: z.string() }).optional(),
        }),
        channelTitle: z.string(),
        channelId: z.string(),
      }),
      contentDetails: z.object({
        duration: z.string(),
      }),
    })
  ),
});

export async function getVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    // Fallback: return basic info from ID only
    return {
      id: videoId,
      title: "Videoaula",
      description: "",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      duration: 0,
      channelTitle: "YouTube",
      channelId: "",
      embedUrl: getEmbedUrl(videoId),
    };
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

    const data = videoInfoSchema.parse(await res.json());
    if (!data.items.length) return null;

    const video = data.items[0];
    return {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url || "",
      duration: parseISODuration(video.contentDetails.duration),
      channelTitle: video.snippet.channelTitle,
      channelId: video.snippet.channelId,
      embedUrl: getEmbedUrl(video.id),
    };
  } catch (error) {
    logger.error("YouTube API error", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// ──────────────────────────────────────────
// Fetch multiple videos at once
// ──────────────────────────────────────────

export async function getVideosInfo(ids: string[]): Promise<YouTubeVideoInfo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || ids.length === 0) return [];

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids.join(",")}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

    const data = videoInfoSchema.parse(await res.json());
    return data.items.map((video) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url || "",
      duration: parseISODuration(video.contentDetails.duration),
      channelTitle: video.snippet.channelTitle,
      channelId: video.snippet.channelId,
      embedUrl: getEmbedUrl(video.id),
    }));
  } catch (error) {
    logger.error("YouTube API error", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

// ──────────────────────────────────────────
// Search YouTube videos
// ──────────────────────────────────────────

const searchSchema = z.object({
  items: z.array(
    z.object({
      id: z.object({
        videoId: z.string(),
      }),
      snippet: z.object({
        title: z.string(),
        description: z.string(),
        thumbnails: z.object({
          high: z.object({ url: z.string() }).optional(),
          default: z.object({ url: z.string() }).optional(),
        }),
        channelTitle: z.string(),
      }),
    })
  ),
});

export async function searchYouTube(query: string, maxResults = 10): Promise<YouTubeSearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube Search API error: ${res.status}`);

    const data = searchSchema.parse(await res.json());
    return data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || "",
      channelTitle: item.snippet.channelTitle,
      duration: 0, // Search results don't include duration; use getVideosInfo for that
    }));
  } catch (error) {
    logger.error("YouTube Search API error", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}
