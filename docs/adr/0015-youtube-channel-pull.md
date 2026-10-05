# 0015. Videos come from the club YouTube channel, with Sanity as overrides

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

The team manager already uploads Friday footage to the club YouTube channel. Until now each video also needed a
Sanity `video` document with its link pasted in, so the website lagged behind the channel or missed videos. The
site is prerendered ([ADR 0004](0004-astro-workers-sanity-d1.md)) and must stay on free tiers
([ADR 0003](0003-free-tiers-only.md)). The YouTube Data API v3 is free up to 10,000 quota units a day per Google
Cloud project, and listing a channel's uploads costs 1 unit per 50 videos.

## Decision

We will list the club channel's videos on the website automatically.

1. **Build-time pull.** `apps/web/src/lib/youtube.ts` reads the channel from the club's YouTube link in Sanity
   (`youtube.com/@handle` or `/channel/UC...`), finds its uploads playlist (`channels`) and reads it
   (`playlistItems`, 50 a page, at most 200 videos). Only public videos are listed: private, unlisted and deleted
   ones are skipped. The date is the London day the video went on YouTube.
2. **Sanity `video` documents become optional overrides**, matched by YouTube video id. A filled-in field (title,
   date, description) replaces YouTube's; _Hide from the website_ drops the video; _Show first_ pins it above newer
   ones. A document whose video isn't on the channel adds it, so links pasted before this change (and unlisted
   videos) keep working. Order: pinned first, then newest.
3. **A daily rebuild.** A new upload needs a build to appear. `deploy.yml` rebuilds production from `release` once
   a day (`schedule`), the same path as a Studio publish. Any publish also picks up new uploads.
4. **Fail soft.** The key is the secret `YOUTUBE_API_KEY` (`__PRODUCTION` and `__DEV`, in
   [README.md#secrets](../../README.md#secrets)). Without a key or a channel link, or when YouTube errors or the
   quota runs out, the build logs a warning and shows only the Sanity videos. It never fails.

## Consequences

- The team manager uploads to YouTube and does nothing else. Sanity is only for hiding, pinning and retitling.
- A new video takes up to a day to appear, or until the next publish. Webhooks from YouTube (PubSubHubbub) would be
  faster but need a public endpoint and a subscription to renew; not worth it for weekly uploads.
- One more secret to keep: a Google Cloud API key per environment, restricted to the YouTube Data API.
- Quota is tiny: about 5 units a build, against 10,000 a day.
- GitHub pauses scheduled workflows after 60 days without repository activity; a commit or a manual run restarts
  them.
- Videos past the 200 cap drop off the site unless a Sanity document adds them back.
- An unlisted video only appears if someone adds it in Sanity, on purpose.
