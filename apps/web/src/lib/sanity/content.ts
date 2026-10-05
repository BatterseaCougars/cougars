// Content access for pages. Everything is fetched at build time; a publish in
// the Studio triggers a rebuild. Until a Sanity project is configured, pages
// render from the fallback club facts (fallback.ts) and empty lists. The merge
// rules are in merge.ts.
import { DEMO_CONTENT, YOUTUBE_API_KEY } from "astro:env/server";
import { onWorker, sanity } from "./client";
import * as q from "./queries";
import { FALLBACK_CLUB, FALLBACK_FRIDAYS, FALLBACK_KUMITE, FALLBACK_PUB, FALLBACK_TEAM } from "./fallback";
import { channelVideos, mergeVideos } from "../youtube";
import { demoAlbums, DEMO_EVENTS, DEMO_KUMITE_RESULTS, DEMO_PLAYERS, DEMO_VIDEOS } from "./demo";
import { toAlbum } from "../server/photos";
import { listOr, mergeClub, mergeFridays, mergeKumite, mergePub, mergeTeam, newestFirst } from "./merge";
import type { Album, Club, ClubEvent, KumiteResult, Player, SiteSettings, Sponsor, VideoOverride } from "./types";

// Sample content for dev builds: `DEMO_CONTENT=true npm run dev`, PR previews and
// scripts/deploy-dev.sh. Real Sanity content still wins wherever it exists. Never set for
// production. Pages built with it are noindex.
export const demo = DEMO_CONTENT;

async function fetchOr<T>(query: string, fallback: T): Promise<T> {
  const client = sanity();
  if (!client) return fallback;
  try {
    return (await client.fetch<T | null>(query)) ?? fallback;
  } catch (error) {
    // A build fails loudly; a server route (ADR 0016) renders with the fallback rather than a 500.
    if (!onWorker) throw error;
    console.error(JSON.stringify({ event: "content.sanity_error", error: String(error) }));
    return fallback;
  }
}

/** A Sanity list, or (with demo content on) the demo list when Sanity has none. */
const fetchList = async <T>(query: string, demoList: T[] | null = null) =>
  listOr(await fetchOr<T[] | null>(query, null), demo ? demoList : null);

// Once per build. On the Worker, an isolate lives on between requests, so re-read every five minutes.
const memo = <T>(fn: () => Promise<T>) => {
  let p: Promise<T> | undefined;
  let at = 0;
  return () => {
    if (!p || (onWorker && Date.now() - at > 5 * 60_000)) [p, at] = [fn(), Date.now()];
    return p;
  };
};

// Club facts, one Sanity singleton each, merged field by field with their fallbacks.
export const getClub = memo(async () => mergeClub(FALLBACK_CLUB, await fetchOr(q.CLUB, null)));
export const getFridays = memo(async () => mergeFridays(FALLBACK_FRIDAYS, await fetchOr(q.FRIDAYS, null)));
export const getPub = memo(async () => mergePub(FALLBACK_PUB, await fetchOr(q.PUB, null)));
export const getTeam = memo(async () => mergeTeam(FALLBACK_TEAM, await fetchOr(q.TEAM, null)));
export const getKumite = memo(async () => mergeKumite(FALLBACK_KUMITE, await fetchOr(q.KUMITE, null)));

/** Every club fact in one object. */
export const getSettings = memo(async (): Promise<SiteSettings> => ({
  ...(await getClub()),
  ...(await getFridays()),
  pub: await getPub(),
  team: await getTeam(),
  kumite: await getKumite(),
}));

/** Kumite winners, newest first: the first is the reigning champion. */
export const getKumiteResults = memo(async () =>
  newestFirst(await fetchList<KumiteResult>(q.KUMITE_RESULTS, DEMO_KUMITE_RESULTS)),
);
// The club channel's uploads, with Sanity `video` documents as overrides (docs/adr/0015-youtube-channel-pull.md).
// Without YOUTUBE_API_KEY or a channel link, only the Sanity videos.
export const getVideos = memo(async () => {
  const [channel, overrides] = await Promise.all([
    getClub().then((c) => channelVideos(clubYoutubeUrl(c), YOUTUBE_API_KEY)),
    fetchList<VideoOverride>(q.VIDEOS, DEMO_VIDEOS),
  ]);
  return mergeVideos(channel, overrides);
});
/** The club's YouTube channel: the channel ID if set, otherwise the channel link under socials. */
export const clubYoutubeUrl = (c: Pick<Club, "youtubeChannelId" | "socials">) =>
  c.youtubeChannelId ? `https://www.youtube.com/channel/${c.youtubeChannelId}` : c.socials.youtube;
export const getEvents = memo(() => fetchList<ClubEvent>(q.EVENTS, DEMO_EVENTS));
export const getEventPages = memo(() => fetchList<ClubEvent>(q.EVENT_PAGES, DEMO_EVENTS));
// Build-time albums: only the home page's no-JavaScript photo strip uses these. /photos reads live (ADR 0016).
export const getAlbums = memo(async () =>
  (await fetchList<Album>(q.ALBUMS, demoAlbums())).flatMap((a) => toAlbum(a) ?? []),
);
export const getPlayers = memo(() => fetchList<Player>(q.PLAYERS, DEMO_PLAYERS));
export const getSponsors = memo(() => fetchList<Sponsor>(q.SPONSORS));

/** Events that haven't finished yet, soonest first. */
export function upcoming(events: ClubEvent[], now = new Date()): ClubEvent[] {
  return events.filter((e) => new Date(e.endsAt ?? e.startsAt) >= now);
}

/** The kit rules, then what's lent to first-timers (if anything): the "Kit" / "Bring" line on several pages. */
export const kitText = (s: Pick<SiteSettings, "kitNotes" | "firstSessionKit">) =>
  [s.kitNotes, s.firstSessionKit].filter(Boolean).join(" ");
