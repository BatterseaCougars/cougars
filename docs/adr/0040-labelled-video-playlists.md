# 0040. Videos come from several club playlists, each labelled

- **Status:** Accepted. Amends [0019](0019-live-videos.md) (its single club playlist).
- **Date:** 2026-10-07

## Context

[ADR 0019](0019-live-videos.md) reads one club playlist. The club now keeps its videos in playlists by kind
(Friday Hockey, Kumite, and Website for anything else), so the team app can later show each kind in the right place.
The website should still show them all on one page, and say which kind each one is. YouTube has no playlist of
playlists.

## Decision

- **Club → YouTube playlists** in the Studio is a list: each entry is a playlist link and an optional label (e.g.
  _Friday hockey_). It replaces the single _YouTube playlist_ field, which was never filled in.
- The website reads every playlist in the list (unlisted videos included), merges them into one list on `/videos`
  and the home reel, and shows each video's label next to its date. A video in two playlists is listed once, under
  the first playlist in the list. A playlist with no label adds its videos unlabelled.
- With no playlists set, the source is the channel's public uploads, as before. Sanity `video` documents still hide,
  pin, retitle and add videos; they don't change the label.
- The playlists are cached together, as one source (10 minutes fresh, a day stale, [ADR 0019](0019-live-videos.md)):
  if one call fails, the last good list for all of them is shown.

## Consequences

- One API call per playlist (per 50 videos) every 10 minutes: still a tiny part of the free quota.
- Uploaders add each video to exactly one playlist; the team app's Upload page says which.
- A new kind of video is a new playlist on YouTube and a new entry in the Studio, with no code change.
- Changing the list (or a label) starts a new cache entry, so the change shows within a minute.
