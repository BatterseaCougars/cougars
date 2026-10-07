# 0053. Every Sanity read goes through its API CDN

- **Status:** Accepted. Supersedes part of [0041](0041-caches-in-production-only.md): its "live reads go to Sanity's
  API (not the CDN)". Its "everything else in 0041 stands" is superseded by [0054](0054-live-reads-are-cached-everywhere.md).
- **Date:** 2026-10-07

## Context

ADR 0041 sent local and dev reads straight to Sanity's API so a change would show at once, expecting "a few API calls
per view". In practice each page view in `astro dev` is several uncached queries (the club facts, the page's own,
then photos, videos and What's on again on page load), and a day of local work, screenshots and several sessions used
up the dev project's monthly API request quota. Sanity then answered every API read with
`402 plan_limit_reached` and the local site showed an error. The API CDN has its own, larger quota and kept working.

The stale content 0041 fixed came from our own caches (the build memo, the Workers Cache API on disk,
`Cache-Control`), not from Sanity's CDN, which is refreshed within seconds of a publish.

## Decision

- Every read uses `apicdn.sanity.io`: the build, `astro dev`, the dev Worker and production
  (`lib/sanity/client.ts` `useCdn: true`, `lib/server/photos.ts`).
- Everything else in 0041 stands: outside production our own caches stay off and pages send `no-store`.
- Sanity Studio and scripts that write still use the API; they're few calls.

## Consequences

- Local and dev pages count against the CDN quota, not the API one, and repeated identical queries are cheap.
- A change published in Studio can take a few seconds to show, not instantly.
- If the CDN quota runs out too, reads fall back the same way as any Sanity failure: builds fail loudly, live pages
  show their empty state.
