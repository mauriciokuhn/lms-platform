import { NextResponse } from "next/server";
import { searchYouTube } from "@/lib/youtube";
import { auth } from "@/lib/auth";

/**
 * GET /api/video/search?q=...&maxResults=10
 *
 * Searches YouTube videos by keyword.
 * Requires YOUTUBE_API_KEY to be configured.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const maxResults = parseInt(searchParams.get("maxResults") || "10", 10);

    if (!query) {
      return NextResponse.json(
        { error: "Query de busca é obrigatória" },
        { status: 400 }
      );
    }

    const results = await searchYouTube(query, Math.min(maxResults, 50));

    return NextResponse.json({ results, query });
  } catch (error) {
    console.error("GET /api/video/search error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar vídeos" },
      { status: 500 }
    );
  }
}
