# 0025. Events live in D1, one club calendar

- **Status:** Superseded by [0030](0030-training-series-and-tournaments.md). Amended [0014](0014-sanity-public-content.md) (events are no longer Sanity content).
- **Date:** 2026-10-06

## Context

Website events are Sanity documents, built into the site. The team app needs a calendar that is mostly Friday
hockey but lets admins add other events, and members sign up to them. Sign-ups, the door register, teams and dues
all live in D1 and hang off an event. Keeping events in Sanity would mean two sources kept in step, and a rebuild
before a change shows on the website.

## Decision

- `events` in D1 holds every club event: kind (friday, kumite, social, other), title, starts_at, ends_at, venue,
  public, signup_enabled, capacity, signup_closes_at, fee_pence, cancelled_at.
- `event_series` holds a weekly rule (Friday hockey). A Cron Trigger keeps the next 8 weeks of events created; each
  can be edited, moved or cancelled on its own.
- Admins add one-off events in the team app.
- Sign-ups, attendance, teams, tournaments and charges refer to `event_id`.
- The website reads public events from D1 live, cached briefly (as the videos are, [0019](0019-live-videos.md)), so
  a change shows without a rebuild. Existing Sanity events are imported once; then the Sanity `event` type is
  removed.

## Consequences

- One calendar; the website and the app always agree.
- Events leave the Studio: they're edited only in the team app.
- The website's events and Fridays pages become server routes, costing Worker requests (well within the free tier).
