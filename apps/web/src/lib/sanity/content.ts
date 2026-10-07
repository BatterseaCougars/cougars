// Content access for pages. Everything is fetched at build time; the site
// rebuilds daily and on each release (ADR 0018). Until a Sanity project is configured, pages
// render from the fallback club facts (fallback.ts) and empty lists. The merge
// rules are in merge.ts.
import { CACHE_READS, DEMO_CONTENT } from "astro:env/server";
import { onWorker, sanity } from "./client";
import * as q from "./queries";
import { FALLBACK_CLUB, FALLBACK_FRIDAYS, FALLBACK_KUMITE, FALLBACK_PUB, FALLBACK_TEAM } from "./fallback";
import { liveVideos } from "../server/videos";
import { videosConfig } from "../server/sanity-env";
import { demoAlbums, DEMO_EVENTS, DEMO_KUMITE_RESULTS, DEMO_PLAYERS } from "./demo";
import { toAlbum } from "../server/photos";
import { toPlayer, type RosterRow } from "../roster";
import { listOr, mergeClub, mergeFridays, mergeKumite, mergePub, mergeTeam, newestFirst } from "./merge";
import type { Album, ClubEvent, KumiteResult, Player, SiteSettings, Sponsor } from "./types";

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

// Once per build. On the production Worker, an isolate lives on between requests, so re-read every five minutes.
// `astro dev` and the dev Worker re-read on every call, so a Studio change shows on the next page load.
const memo = <T>(fn: () => Promise<T>) => {
  let p: Promise<T> | undefined;
  let at = 0;
  const reuse = () => !import.meta.env.DEV && (!onWorker || (CACHE_READS && Date.now() - at < 5 * 60_000));
  return () => {
    if (!p || !reuse()) [p, at] = [fn(), Date.now()];
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
export const getSettings = memo(async (): Promise<SiteSettings> => {
  // All at once: in `astro dev` each is a fresh read, so one after another adds up
  const [club, fridays, pub, team, kumite] = await Promise.all([
    getClub(),
    getFridays(),
    getPub(),
    getTeam(),
    getKumite(),
  ]);
  return { ...club, ...fridays, pub, team, kumite };
});

/** Kumite winners, newest first: the first is the reigning champion. */
export const getKumiteResults = memo(async () =>
  newestFirst(await fetchList<KumiteResult>(q.KUMITE_RESULTS, DEMO_KUMITE_RESULTS)),
);
// The club's videos as of this build: only the homepage's no-JavaScript fallback uses these. /videos and the
// homepage reel read them live (lib/server/videos.ts, docs/adr/0019-live-videos.md).
export const getVideos = memo(async () => (await liveVideos(videosConfig())).data);
export const getEvents = memo(() => fetchList<ClubEvent>(q.EVENTS, DEMO_EVENTS));
export const getEventPages = memo(() => fetchList<ClubEvent>(q.EVENT_PAGES, DEMO_EVENTS));
// Build-time albums: only the home page's no-JavaScript photo strip uses these. /photos reads live (ADR 0016).
export const getAlbums = memo(async () =>
  (await fetchList<Album>(q.ALBUMS, demoAlbums())).flatMap((a) => toAlbum(a) ?? []),
);
// The roster: the active Cougars as of this build (lib/roster.ts, scripts/roster-snapshot.mjs). Without a snapshot
// (a fresh checkout, a database that couldn't be read), Sanity's players or the samples.
const snapshot = import.meta.glob<RosterRow[] | null>("../../data/roster.local.json", {
  eager: true,
  import: "default",
});
export const getPlayers = memo(async () => {
  const roster = Object.values(snapshot)[0];
  return roster ? roster.map(toPlayer) : fetchList<Player>(q.PLAYERS, DEMO_PLAYERS);
});
export const getSponsors = memo(() => fetchList<Sponsor>(q.SPONSORS));

/** Events that haven't finished yet, soonest first. */
export function upcoming(events: ClubEvent[], now = new Date()): ClubEvent[] {
  return events.filter((e) => new Date(e.endsAt ?? e.startsAt) >= now);
}

/** The kit rules, then what's lent to first-timers (if anything): the "Kit" / "Bring" line on several pages. */
export const kitText = (s: Pick<SiteSettings, "kitNotes" | "firstSessionKit">) =>
  [s.kitNotes, s.firstSessionKit].filter(Boolean).join(" ");
