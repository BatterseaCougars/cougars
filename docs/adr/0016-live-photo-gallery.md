# 0016. Photos are read live from Sanity, not at build time

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

[ADR 0004](0004-astro-workers-sanity-d1.md) has the site read Sanity at build time, and a publish triggers a
rebuild (about 2 minutes, through CI). Photos are the content the team manager adds most often, usually from
a phone straight after a Friday or a Kumite. They asked not to have to "publish the site" to get a photo into
the gallery: an album should be on the site once it's published in the Studio, with no build and no CI run.

## Decision

We will render the photo pages on the Worker at request time, as an exception to ADR 0004:

- `/photos` (album covers) and `/photos/<album>` (its photos, masonry and lightbox) are server routes
  (`prerender = false`). `/api/photos/latest` returns the newest photos as JSON.
- They query Sanity's **API CDN** (`<project>.apicdn.sanity.io`, published perspective) with plain `fetch`, in
  `apps/web/src/lib/server/photos.ts`. The GROQ stays in `queries.ts`, the types in `types.ts`.
- The home page stays prerendered. Its photo strip shows the photos from the last build (enough without
  JavaScript), then swaps in `/api/photos/latest`.
- Responses send `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600`. A publish
  shows within seconds on the API CDN, and within about five minutes on the site.
- If Sanity can't be reached, the pages show a friendly "won't load right now" state (HTTP 503, not cached),
  never an error page. An unknown album gets the site's 404 page.
- No token: the Sanity free plan only has public datasets, which anyone can read. The code sends
  `SANITY_API_TOKEN` if the Worker has it, so a private dataset would only need that set as a Worker secret.
- Album publishes no longer need the rebuild webhook (`album` comes out of its filter).

Pages on the Worker can't use build-time image resizing (`imageService: "compile"`), so the shared layout's
logo and background are ready-sized files in `src/assets/`, used as they are.

## Consequences

- An album is live without a rebuild. The home strip's no-JavaScript fallback is as old as the last build.
- Every view of a photo page is one Worker request and, until the edge cache is on, one Sanity API CDN
  request. Cloudflare's Cache API and `s-maxage` only take effect on a custom domain (M5); on `*.workers.dev`
  every view reaches the Worker.
- Free-tier budget (checked 2026-10-05 on [sanity.io/pricing](https://www.sanity.io/pricing)): Sanity Free
  allows 1M API CDN requests and 250k API requests a month, 100 GB of assets and 100 GB of bandwidth a month,
  and 2 datasets, public only. Cloudflare Workers Free allows 100k requests a day. A club site with a few
  hundred photo views a day uses well under 1% of each. Images come from Sanity's image CDN, which counts
  against the bandwidth allowance, not the request ones.
- Server-rendered pages also render the footer, which reads settings from Sanity: on the Worker that read
  goes through the API CDN, is kept for five minutes per Worker instance, and falls back to the built-in copy
  if Sanity is down.
- Photo pages depend on Sanity being up at view time, not just at build time.
