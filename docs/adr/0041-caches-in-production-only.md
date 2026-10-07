# 0041. Live reads are cached in production only

- **Status:** Accepted. Amends [0016](0016-live-photo-gallery.md) and [0019](0019-live-videos.md) (their caching).
- **Date:** 2026-10-07

## Context

The live photo and video pages ([ADR 0016](0016-live-photo-gallery.md), [ADR 0019](0019-live-videos.md)) cache
their reads: Sanity's API CDN, a 10-minute YouTube and 1-minute Sanity cache in memory and in the Workers Cache API,
and `Cache-Control` for browsers and the edge. Build-time content is also kept for the life of the process. Locally
and on the dev site this kept showing old content after a change, twice; the Workers Cache API is even kept on disk
under `.wrangler`, so a restart didn't clear it. Outside production, freshness matters more than speed.

## Decision

- One build-time switch, `CACHE_READS` (astro:env), is true only when `SITE_ENV=production`.
- Without it, live reads go to Sanity's API (not the CDN), the video cache neither keeps nor reuses anything (the
  last good list still covers a YouTube failure), live pages send `Cache-Control: no-store`, and
  `lib/sanity/content.ts` re-reads Sanity on every call in `astro dev` and on the dev Worker.
- Production is unchanged.

## Consequences

- Local and the dev site always show current Sanity content, YouTube playlists and code, at the cost of slower
  pages and a few API calls per view (well inside the free quotas: Sanity's API, YouTube's 10,000 units a day).
- Production caching is no longer exercised before release; the cache code stays covered by unit tests.
