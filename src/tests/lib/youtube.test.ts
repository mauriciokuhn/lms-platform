/**
 * Unit tests for src/lib/youtube.ts.
 *
 * Covers the pure helpers (extractYouTubeId, getEmbedUrl, getWatchUrl,
 * parseISODuration) and the Data API paths (getVideoInfo, getVideosInfo,
 * searchYouTube) with a mocked global fetch — no real network.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  extractYouTubeId,
  getEmbedUrl,
  getWatchUrl,
  parseISODuration,
  getVideoInfo,
  getVideosInfo,
  searchYouTube,
} from "@/lib/youtube";

// ── Pure URL helpers ─────────────────────────────────────────────────────

describe("extractYouTubeId", () => {
  it("extracts from watch URLs", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from embed URLs", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from short URLs (youtu.be)", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from shorts URLs", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts from v/ URLs", () => {
    expect(extractYouTubeId("https://www.youtube.com/v/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for non-YouTube URLs and invalid ids", () => {
    expect(extractYouTubeId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(extractYouTubeId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(extractYouTubeId("not a url")).toBeNull();
  });
});

describe("URL builders", () => {
  it("getEmbedUrl builds the embed URL", () => {
    expect(getEmbedUrl("abc123")).toBe("https://www.youtube.com/embed/abc123");
  });

  it("getWatchUrl builds the watch URL", () => {
    expect(getWatchUrl("abc123")).toBe("https://www.youtube.com/watch?v=abc123");
  });
});

// ── ISO 8601 duration ────────────────────────────────────────────────────

describe("parseISODuration", () => {
  it("parses hours, minutes and seconds", () => {
    expect(parseISODuration("PT1H2M3S")).toBe(3723);
  });

  it("parses hours only", () => {
    expect(parseISODuration("PT1H")).toBe(3600);
  });

  it("parses minutes only", () => {
    expect(parseISODuration("PT2M")).toBe(120);
  });

  it("parses seconds only", () => {
    expect(parseISODuration("PT45S")).toBe(45);
  });

  it("parses minutes and seconds", () => {
    expect(parseISODuration("PT1M30S")).toBe(90);
  });

  it("returns 0 for invalid or empty durations", () => {
    expect(parseISODuration("garbage")).toBe(0);
    expect(parseISODuration("")).toBe(0);
    expect(parseISODuration("P1D")).toBe(0);
  });
});

// ── Data API paths (mocked fetch) ────────────────────────────────────────

const fetchMock = vi.fn();

const VIDEO_PAYLOAD = {
  items: [
    {
      id: "dQw4w9WgXcQ",
      snippet: {
        title: "Rick Astley - Never Gonna Give You Up",
        description: "Official video",
        thumbnails: { high: { url: "https://i.ytimg.com/vi/hqdefault.jpg" } },
        channelTitle: "Rick Astley",
        channelId: "UCuAXFkgsw1L7xaCfnd5JJOw",
      },
      contentDetails: { duration: "PT3M32S" },
    },
  ],
};

const SEARCH_PAYLOAD = {
  items: [
    {
      id: { videoId: "dQw4w9WgXcQ" },
      snippet: {
        title: "Rick Astley - Never Gonna Give You Up",
        description: "Official video",
        thumbnails: { default: { url: "https://i.ytimg.com/vi/default.jpg" } },
        channelTitle: "Rick Astley",
      },
    },
  ],
};

function mockFetchOk(payload: unknown) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => payload });
}

describe("getVideoInfo", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("falls back to basic info when no API key is set", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    const info = await getVideoInfo("dQw4w9WgXcQ");

    expect(info).toEqual({
      id: "dQw4w9WgXcQ",
      title: "Videoaula",
      description: "",
      thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      duration: 0,
      channelTitle: "YouTube",
      channelId: "",
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches rich metadata when an API key is set", async () => {
    mockFetchOk(VIDEO_PAYLOAD);
    const info = await getVideoInfo("dQw4w9WgXcQ");

    expect(info?.title).toBe("Rick Astley - Never Gonna Give You Up");
    expect(info?.duration).toBe(212);
    expect(info?.thumbnailUrl).toBe("https://i.ytimg.com/vi/hqdefault.jpg");
    expect(info?.channelTitle).toBe("Rick Astley");
    expect(info?.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("key=test-key"));
  });

  it("returns null when the API responds with an error status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    expect(await getVideoInfo("dQw4w9WgXcQ")).toBeNull();
  });

  it("returns null when the API returns no items", async () => {
    mockFetchOk({ items: [] });
    expect(await getVideoInfo("nonexistent")).toBeNull();
  });

  it("returns null on network failure", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    expect(await getVideoInfo("dQw4w9WgXcQ")).toBeNull();
  });

  it("falls back to the default thumbnail when high is missing", async () => {
    mockFetchOk({
      items: [
        {
          id: "x",
          snippet: {
            title: "T",
            description: "",
            thumbnails: { default: { url: "https://i.ytimg.com/vi/default.jpg" } },
            channelTitle: "C",
            channelId: "cid",
          },
          contentDetails: { duration: "PT1M" },
        },
      ],
    });
    const info = await getVideoInfo("x");
    expect(info?.thumbnailUrl).toBe("https://i.ytimg.com/vi/default.jpg");
  });
});

describe("getVideosInfo", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns an empty array without an API key", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    expect(await getVideosInfo(["dQw4w9WgXcQ"])).toEqual([]);
  });

  it("returns an empty array for an empty id list", async () => {
    expect(await getVideosInfo([])).toEqual([]);
  });

  it("maps multiple videos from the API", async () => {
    mockFetchOk(VIDEO_PAYLOAD);
    const videos = await getVideosInfo(["dQw4w9WgXcQ"]);

    expect(videos).toHaveLength(1);
    expect(videos[0]).toMatchObject({
      id: "dQw4w9WgXcQ",
      duration: 212,
      channelTitle: "Rick Astley",
    });
  });

  it("returns an empty array when the API fails", async () => {
    fetchMock.mockRejectedValue(new Error("boom"));
    expect(await getVideosInfo(["dQw4w9WgXcQ"])).toEqual([]);
  });
});

describe("searchYouTube", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("YOUTUBE_API_KEY", "test-key");
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns an empty array without an API key", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");
    expect(await searchYouTube("react")).toEqual([]);
  });

  it("maps search results with duration 0", async () => {
    mockFetchOk(SEARCH_PAYLOAD);
    const results = await searchYouTube("rick astley", 5);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "dQw4w9WgXcQ",
      title: "Rick Astley - Never Gonna Give You Up",
      duration: 0,
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("maxResults=5"));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("q=rick%20astley"));
  });

  it("returns an empty array when the API fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    expect(await searchYouTube("react")).toEqual([]);
  });
});
