# 0096. Live pages are pushed to over SSE from a Durable Object; polling is the fallback

- **Status:** Accepted. Amends [0072](0072-live-update-pace-is-a-setting.md), [0058](0058-degrade-instead-of-break.md)
  and [0003](0003-free-tiers-only.md).
- **Date:** 2026-10-09

## Context

Live pages (the draft room, a game's live page, the tournament's home on the day) follow along by polling (0072):
every phone asks every 10 seconds whether the club has changed. Each check is a Worker request against the free
100,000 a day, so a 2-hour draft night with 30 phones is 21,600 of them (22% of the day), and another captain's pick
takes up to 10 seconds to show. 0072 ruled push out as not free. That's no longer so: since April 2025 Durable Objects
are on the Workers Free plan, as long as the class is SQLite-backed, with 100,000 requests and 13,000 GB-s of duration
a day. A Durable Object's request has no wall-clock limit while the caller stays connected, so it can hold one
open stream per phone and write to all of them at once. A Worker alone can't: one stream is one request, and the
free plan's 10 ms of CPU a request runs out within minutes of checking D1 every second.

## Decision

- **One Durable Object per environment, `LiveHub`** (binding `LIVE`, `team/app/worker/live.ts`), declared with
  `new_sqlite_classes` because the free plan requires it, **storing nothing**: the open streams live in memory, D1
  stays the only source of truth, and an object restart just drops the streams. The free-tiers rule (0003) reads
  "Durable Objects that store rows" from now on; a fan-out object is fine.
- **`GET /api/live` is a Server-Sent Events stream** for any signed-in member. Its events are only the names of the
  club's parts that changed (0057's slices), never data; what a member sees still comes from their own bootstrap.
- **Every change notifies the hub** at the one place all writes pass (`handleApi`, after the data version bump),
  with the slices the route declared, through `waitUntil`. A notify that fails is logged, never fails the change.
- **A page reloads on an event naming a part it follows** (the ETag check, 0054: one request, a 304 when it already
  has it), and on reconnecting after a drop. The stream is open only while the page is in view; hidden, it's
  closed, and coming back reopens it and catches up (0057).
- **Reconnecting goes through the brake (0058)**: the browser's own 3-second retry is turned off; the app reopens
  after 10 seconds, doubling to 5 minutes, never while the brake rests, and each connect counts as one of the tab's
  calls for the day. The hub sends a comment every 30 seconds so dead phones are dropped.
- **Polling is the fallback, not gone.** While the stream is open a page still checks every 60 seconds, as a safety
  net; while it's down, on the admins' setting (0072). The page says which: "Live", or "Updates every 10 seconds".
- **The Usage page shows Durable Object requests and duration** beside the day's use, and the 80% check (0059)
  covers them.

## Consequences

- A pick or a goal shows on every phone within about a second. A draft night is about 2,000 Worker requests instead
  of 21,600, and about 900 GB-s of the 13,000 (one object billed while anyone is connected, whatever the number of
  phones). A tournament day of live scoring is about 1,800 GB-s.
- The app has two ways to hear about a change, and both have to keep working: the tests drive the stream, and the
  fallback is what a locked phone, a dropped connection or a hub restart falls back on.
- Deploying the first time applies the `v1` migration to that Worker (`cougars-team-dev`, and `cougars-team` at
  launch). A previews-only upload (`wrangler versions upload`) can't apply it; the team app deploys with
  `wrangler deploy`.
- The same object would carry the website's live Kumite page one day; for now the website keeps polling.
