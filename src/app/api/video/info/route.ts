import { NextResponse } from "next/server";
import { extractYouTubeId, getVideoInfo } from "@/lib/youtube";
import { logger } from "@/lib/logger";

/**
 * GET /api/video/info?url=...
 *
 * Fetches YouTube video metadata (title, duration, thumbnail, channel).
 * Uses YouTube Data API if YOUTUBE_API_KEY is configured, otherwise
 * returns basic info from the video ID only.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const videoIdParam = searchParams.get("videoId");

    const videoId = videoIdParam || (url ? extractYouTubeId(url) : null);

    if (!videoId) {
      return NextResponse.json(
        { error: "URL ou videoId inválido" },
        { status: 400 }
      );
    }

    const info = await getVideoInfo(videoId);

    if (!info) {
      return NextResponse.json(
        { error: "Vídeo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(info);
  } catch (error) {
    logger.error("GET /api/video/info error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Erro ao buscar informações do vídeo" },
      { status: 500 }
    );
  }
}
