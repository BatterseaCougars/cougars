import { londonDay } from "./dates";
import type { Video, VideoOverride } from "./sanity/types";

/** Extract the 11-char video id from any common YouTube URL form, or null. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^(www\.|m\.)/, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const thumbnailUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

// ---------------------------------------------------------------------------------------------------------------
// The club channel, pulled at build time (docs/adr/0015-youtube-channel-pull.md). YouTube Data API v3 with an API
// key: one `channels` call finds the uploads playlist, then one `playlistItems` call per 50 videos. Each call costs
// 1 unit of the free 10,000 a day.

export type Channel = { handle: string } | { id: string };

/** The channel in a club YouTube link: youtube.com/@handle, youtube.com/channel/UC..., or a bare "@handle". */
export function parseChannel(url: string): Channel | null {
  const s = url.trim();
  if (/^@[\w.-]{3,30}$/.test(s)) return { handle: s.slice(1) };
  try {
    const u = new URL(s);
    if (!/^(www\.|m\.)?youtube\.com$/.test(u.hostname)) return null;
    const handle = u.pathname.match(/^\/@([\w.-]{3,30})(?:\/|$)/)?.[1];
    if (handle) return { handle: decodeURIComponent(handle) };
    const id = u.pathname.match(/^\/channel\/(UC[\w-]{22})(?:\/|$)/)?.[1];
    return id ? { id } : null;
  } catch {
    return null;
  }
}

const API = "https://www.googleapis.com/youtube/v3";
const PAGE = 50; // the API's maximum per page

interface PlaylistItem {
  snippet?: { title?: string; description?: string; publishedAt?: string; resourceId?: { videoId?: string } };
  contentDetails?: { videoId?: string; videoPublishedAt?: string };
  status?: { privacyStatus?: string };
}

/** A channel upload as a Video, or null for private, unlisted and deleted ones. */
export function toVideo(item: PlaylistItem): Video | null {
  const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
  // Deleted videos have no videoPublishedAt; private and unlisted ones aren't for the website.
  const published = item.contentDetails?.videoPublishedAt;
  if (!id || !published || item.status?.privacyStatus !== "public") return null;
  return {
    _id: `youtube-${id}`,
    title: item.snippet?.title?.trim() || "Untitled video",
    recordedOn: londonDay(published),
    youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
    description: firstParagraph(item.snippet?.description),
  };
}

// YouTube descriptions often end in links and hashtags; the card only has room for the opening lines.
const firstParagraph = (text?: string) =>
  text
    ?.trim()
    .split(/\n\s*\n/)[0]
    .trim() || null;

/**
 * The channel's public uploads, newest first, at most `max`. Throws on any API or network error, with a message
 * that never contains the key.
 */
export async function fetchChannelVideos(
  channel: Channel,
  key: string,
  { max = 200, fetch = globalThis.fetch } = {},
): Promise<Video[]> {
  const get = async <T>(path: string, params: Record<string, string>): Promise<T> => {
    const res = await fetch(`${API}/${path}?${new URLSearchParams({ ...params, key })}`, {
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!res.ok) throw new Error(`YouTube ${path}: ${res.status} ${body.error?.message ?? res.statusText}`);
    return body;
  };

  const which: Record<string, string> = "handle" in channel ? { forHandle: `@${channel.handle}` } : { id: channel.id };
  const { items = [] } = await get<{ items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] }>(
    "channels",
    { part: "contentDetails", ...which },
  );
  const uploads = items[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error(`YouTube channel not found: ${JSON.stringify(which)}`);

  const videos: Video[] = [];
  let pageToken: string | undefined;
  do {
    const page = await get<{ items?: PlaylistItem[]; nextPageToken?: string }>("playlistItems", {
      part: "snippet,contentDetails,status",
      playlistId: uploads,
      maxResults: String(PAGE),
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of page.items ?? []) {
      const v = toVideo(item);
      if (v) videos.push(v);
    }
    pageToken = page.nextPageToken;
  } while (pageToken && videos.length < max);
  return videos.slice(0, max);
}

/**
 * The club channel's videos for the build, or [] when there's no key or link, or YouTube fails. Never throws: the
 * site still builds, with the Sanity videos only.
 */
export async function channelVideos(
  url: string | null | undefined,
  key: string | undefined,
  options?: Parameters<typeof fetchChannelVideos>[2],
): Promise<Video[]> {
  if (!key || !url) return [];
  const channel = parseChannel(url);
  if (!channel) {
    console.warn(`[youtube] Can't find a channel in "${url}". Use youtube.com/@handle. Showing Sanity videos only.`);
    return [];
  }
  try {
    return await fetchChannelVideos(channel, key, options);
  } catch (e) {
    console.warn(`[youtube] ${(e as Error).message}. Showing Sanity videos only.`);
    return [];
  }
}

/**
 * Channel videos plus Sanity `video` documents, for the website. A document with the same YouTube id overrides the
 * channel video field by field (empty fields keep YouTube's); one with no match adds a video. Hidden ones are
 * dropped. Pinned first, then newest first.
 */
export function mergeVideos(channel: Video[], overrides: VideoOverride[]): Video[] {
  const byId = new Map<string, Video & { hidden?: boolean; pinned?: boolean }>();
  for (const v of channel) byId.set(youtubeId(v.youtubeUrl)!, v);
  for (const o of overrides) {
    const id = youtubeId(o.youtubeUrl);
    if (!id) continue;
    const base = byId.get(id);
    byId.set(id, {
      _id: o._id,
      title: o.title || base?.title || "Cougars video",
      recordedOn: o.recordedOn || base?.recordedOn || londonDay(o._createdAt ?? new Date().toISOString()),
      youtubeUrl: base?.youtubeUrl ?? o.youtubeUrl,
      description: o.description || base?.description || null,
      hidden: !!o.hidden,
      pinned: !!o.pinned,
    });
  }
  return [...byId.values()]
    .filter((v) => !v.hidden)
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || day(b.recordedOn).localeCompare(day(a.recordedOn)))
    .map(({ hidden: _h, pinned: _p, ...v }) => v);
}

// Sanity dates are "YYYY-MM-DD"; older documents and demo videos may hold a full timestamp.
const day = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : londonDay(d));
