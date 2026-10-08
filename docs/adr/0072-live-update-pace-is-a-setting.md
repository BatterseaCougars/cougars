# 0072. How often live pages check for updates is the admins' setting

- **Status:** Accepted. Amends [0071](0071-scoring-games-live.md) and the draft room's fixed 10 seconds.
- **Date:** 2026-10-08

## Context

Live pages follow along by polling: a game being scored, the tournament's home on the day, the draft room while it's
open. Every check from every phone is a Worker request against the club's free daily allowance (100,000, ADR 0058,
0059). A tournament day with 30 phones on a live page for 4 hours at 10 seconds is about 43,000 requests. The club may
one day pay for hosting, when checking more often costs next to nothing.

## Decision

- **One club setting, `live_refresh_seconds`** (`club_settings`, one row; no row means 10), 5 to 120 seconds, sent
  to everyone in the bootstrap (`settings`). Admins (`manage:Settings`) set it on **Usage**, beside today's use, with
  what it costs: requests per phone per hour, and a tournament day as a share of the free day.
- **Every live page uses it** (`lib/live-updates.svelte.ts`): the game page from the game up next to full time (the
  scorekeeper's too: the same person may have it open on two devices), the tournament's home on its day until the last game's over, and the
  draft room while it's open. Only while the page is in view; the brake (0058) still has the last word.
- **Each page says how often**: "Updates every 10 seconds, to keep the club on the free plan."

## Consequences

- Moving to a paid plan is a setting change, not a code change.
- Push (WebSockets, Durable Objects) stays out: it isn't free (CLAUDE.md).
