# 0039. Videos are uploaded on YouTube, not through the app

- **Status:** Accepted. Replaces the planned in-app video upload (team-app roadmap T7).
- **Date:** 2026-10-07

## Context

The team-app roadmap planned for contributors to upload videos in the app: the Worker would hold an OAuth refresh
token for the club Google account (`youtube.upload`) and open resumable uploads on the club channel. That means a
long-lived token that can post as the club, a Google OAuth consent screen, and YouTube's API compliance audit (weeks;
until it passes, API uploads are locked to Private). It also costs about 1,600 of the 10,000 daily quota units per
upload. The YouTube app and Studio already do uploads well, on any phone.

## Decision

We will not upload videos through the app.

- Upload shows people with `upload:Video` a link to YouTube's upload page. They upload there, signed in with their
  own Google account, as the club channel.
- Who can upload is YouTube's channel permissions (YouTube Studio → Settings → Permissions, Editor or above), managed
  by the club account. The app holds no YouTube credential that can write.
- Videos go up Unlisted and into the club playlist; the website reads that playlist with a read-only API key
  ([ADR 0019](0019-live-videos.md)).
- `upload:Video` stays in the catalog ([ADR 0024](0024-action-based-authorization.md)) and now only decides who sees
  the link.

## Consequences

- No OAuth client, refresh token, consent screen or API audit for YouTube. The only YouTube secret stays the read
  key.
- Uploading leaves the app, and a contributor has to pick the club channel and the playlist themselves; the page
  says so.
- Giving or removing someone's upload access happens in YouTube Studio, not in the app's roles. Ticking
  `upload:Video` alone doesn't let anyone upload.
