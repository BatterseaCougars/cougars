// Content access for pages. Everything is fetched at build time; a publish in
// the Studio triggers a rebuild. Until a Sanity project is configured, pages
// render from FALLBACK_SETTINGS (the copy from the old Wix site) and empty lists.
import { DEMO_CONTENT } from "astro:env/server";
import { sanity } from "./client";
import * as q from "./queries";
import { FALLBACK_SETTINGS } from "./fallback";
import { DEMO_ALBUMS, DEMO_EVENTS, DEMO_PLAYERS, DEMO_POSTS, DEMO_VIDEOS } from "./demo";
import type { Album, ClubEvent, Player, Post, SiteSettings, Sponsor, Video } from "./types";

// Local design preview only: `DEMO_CONTENT=true npm run dev`. Never in builds.
const demo = import.meta.env.DEV && DEMO_CONTENT;

async function fetchOr<T>(query: string, fallback: T): Promise<T> {
  const client = sanity();
  if (!client) return fallback;
  return (await client.fetch<T | null>(query)) ?? fallback;
}

const memo = <T>(fn: () => Promise<T>) => {
  let p: Promise<T> | undefined;
  return () => (p ??= fn());
};

export const getSettings = memo(async (): Promise<SiteSettings> => {
  const s = await fetchOr<Partial<SiteSettings>>(q.SETTINGS, {});
  return {
    ...FALLBACK_SETTINGS,
    ...stripNulls(s),
    socials: { ...FALLBACK_SETTINGS.socials, ...stripNulls(s.socials ?? {}) },
    kumite: { ...FALLBACK_SETTINGS.kumite, ...stripNulls(s.kumite ?? {}) },
    team: { ...FALLBACK_SETTINGS.team, ...stripNulls(s.team ?? {}) },
  };
});
export const getPosts = memo(() => fetchOr<Post[]>(q.POSTS, demo ? DEMO_POSTS : []));
export const getPostPages = memo(() => fetchOr<Post[]>(q.POST_PAGES, demo ? DEMO_POSTS : []));
export const getVideos = memo(() => fetchOr<Video[]>(q.VIDEOS, demo ? DEMO_VIDEOS : []));
export const getEvents = memo(() => fetchOr<ClubEvent[]>(q.EVENTS, demo ? DEMO_EVENTS : []));
export const getEventPages = memo(() => fetchOr<ClubEvent[]>(q.EVENT_PAGES, demo ? DEMO_EVENTS : []));
export const getAlbums = memo(() => fetchOr<Album[]>(q.ALBUMS, demo ? DEMO_ALBUMS : []));
export const getPlayers = memo(() => fetchOr<Player[]>(q.PLAYERS, demo ? DEMO_PLAYERS : []));
export const getSponsors = memo(() => fetchOr<Sponsor[]>(q.SPONSORS, []));

/** Events that haven't finished yet, soonest first. */
export function upcoming(events: ClubEvent[], now = new Date()): ClubEvent[] {
  return events.filter((e) => new Date(e.endsAt ?? e.startsAt) >= now);
}

function stripNulls<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;
}
