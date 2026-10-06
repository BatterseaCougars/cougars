# 0019. Videos are read live from YouTube and Sanity, cached

- **Status:** Accepted. Supersedes [0015](0015-youtube-channel-pull.md) (its build-time pull); amends
  [0018](0018-rebuilds-until-team-app.md) (the daily rebuild no longer carries YouTube).
- **Date:** 2026-10-06

## Context

[ADR 0015](0015-youtube-channel-pull.md) listed the club's YouTube uploads at build time, so a new video only
appeared after the next production build, which since [ADR 0018](0018-rebuilds-until-team-app.md) is the next
morning. A video should be on the site soon after it's on YouTube, the way photos are after they're published
([ADR 0016](0016-live-photo-gallery.md)).

Two things came up in the club-facts check: the Friday videos are uploaded as **unlisted**, which a channel's public
uploads list doesn't include; and the club will move them to its own channel, possibly still unlisted.

## Decision

- `/videos` renders on the Worker at request time, from YouTube and Sanity (`lib/server/videos.ts`). The home page
  stays prerendered; its video reel (`components/VideoReel.astro`) swaps in a live copy rendered by `/videos/reel/`.
- **Caching** (`lib/server/cache.ts`), so a page view almost never costs an API call:
  - YouTube: fresh for 10 minutes. If YouTube fails (an outage, a spent quota), the last good list is shown for up
    to a day.
  - Sanity (the club's YouTube settings and the `video` documents): fresh for a minute, stale for an hour.
  - Layers: the isolate's memory, then Cloudflare's edge cache (once there's a custom domain), then the source;
    concurrent misses share one request. Pages also send `Cache-Control` (a minute in browsers, five at the edge).
- **Source**: a club playlist if one is set in the Studio (Club → YouTube playlist), including its unlisted videos;
  otherwise the channel's public uploads. Sanity `video` documents still hide, pin and retitle, and pasted links still
  add videos (unlisted or not).
- `YOUTUBE_API_KEY` becomes a Worker secret, pushed from Secrets Manager by `deploy.yml` on every deploy. It never
  reaches the browser. Without it, the site shows the Sanity videos only.

## Consequences

- A new upload shows within about 10 minutes; a Studio change to a video within about a minute.
- Quota: at most a few calls per 10 minutes per data centre, far under the free 10,000 units a day.
- `/videos` is a Worker request per view (free tier: 100,000 a day), until the edge cache takes most of them.
- The daily rebuild is now only for Studio content (ADR 0018).
- Rotating the key means updating Secrets Manager and deploying (which pushes the new Worker secret).
