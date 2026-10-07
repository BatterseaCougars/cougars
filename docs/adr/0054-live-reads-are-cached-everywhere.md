# 0054. Live reads are cached everywhere, on the server

- **Status:** Accepted. Supersedes [0041](0041-caches-in-production-only.md), and the part of
  [0053](0053-sanity-reads-through-its-cdn.md) that kept 0041's "outside production our own caches stay off".
- **Date:** 2026-10-07

## Context

Events, photos and videos are read live on the Worker ([ADR 0016](0016-live-photo-gallery.md),
[ADR 0019](0019-live-videos.md), [ADR 0042](0042-whats-on-from-the-club-calendar.md)) so that a change shows without
a rebuild and deploy. They were never meant to be uncached. ADR 0041 turned every cache off outside production so
local and dev would show changes at once. It expected "a few API calls per view", but every page view, reload and
build read Sanity and YouTube again. That used up the dev Sanity project's API quota
([ADR 0053](0053-sanity-reads-through-its-cdn.md)) and then YouTube's 10,000 units a day: the video playlists
disappeared from the local site.

Even in production only the videos were cached on the server. Photos, What's on, events and player cards sent
`Cache-Control`, but Cloudflare doesn't keep a Worker's own replies because of it; only browsers do. Every visitor
read Sanity or D1 again.

The team app reloads the whole club (`/api/bootstrap`) when it opens and after every change, against D1's 5M rows
read a day. Most of those reloads find nothing new.

## Decision

- Local, the dev site and production cache the same way. The `CACHE_READS` switch is gone.
- Every live read on the website goes through `lib/server/cache.ts` (in memory, then the Workers Cache API, with
  the last good copy kept for a failure):

  | Read                                 | Fresh for  | Last good copy kept |
  | ------------------------------------ | ---------- | ------------------- |
  | YouTube playlists                    | 10 minutes | a day               |
  | Sanity: videos                       | 1 minute   | an hour             |
  | Sanity: photos                       | 1 minute   | a day               |
  | D1: What's on, events, a player card | 1 minute   | an hour             |

- Live pages send the same `Cache-Control` everywhere (`no-store` only when their source is unreachable).
- Build-time content in `lib/sanity/content.ts` is read once per build, every five minutes on a Worker, and every
  minute in `astro dev`.
- The team app's bootstrap has an ETag: the club's data version (`data_version`, one more on every change through
  the API, the club seed and the roster seed), the member, the day and the deploy. It's sent `private, no-cache`,
  so the browser asks again with `If-None-Match` by itself, and gets an empty 304 after one row read when nothing
  has changed. The app's code doesn't change.

## Consequences

- A page view costs Sanity, YouTube or D1 at most one read a minute per data centre, however many people look or
  how often anyone reloads, locally too.
- A change takes up to a minute to show on the website (up to ten for a new YouTube upload, a little more where a
  browser holds the page). To see one sooner locally, restart `astro dev` and clear `.wrangler`.
- The caching production relies on now runs on local and dev before release.
- A change made to D1 directly (`wrangler d1 execute`, a script) must also bump `data_version`, or members' apps
  keep what they have until the next change, the next day or the next deploy. The seeds already do.
- After a change, the app reloads only the parts it touched ([ADR 0057](0057-changes-reply-with-what-they-touched.md)).
