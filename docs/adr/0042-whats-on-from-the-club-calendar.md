# 0042. The home page's What's on reads the club calendar live

- **Status:** Accepted. Carries out the website half of [0030](0030-training-series-and-tournaments.md) for the home
  page; the events pages and the Kumite poster still read Sanity for now.
- **Date:** 2026-10-07

## Context

The club calendar lives in D1 and is kept in the team app ([ADR 0030](0030-training-series-and-tournaments.md)):
training sessions, tournaments and one-off events. Dates change too often for a rebuild, and the home page's "Also
on the bill" list was Sanity events as of the last build. One-off events also had no description, no end time, no
way to be shown on the website, and couldn't be changed or called off once added.

## Decision

- The home page's events section is **What's on**: the next 3 training sessions, the next 3 tournaments (each by its
  own name, never "Tournament") and the next 4 one-off events, in date order, from D1 (`lib/server/whats-on.ts`).
  Only public ones: a training series' and a tournament's `public`, and a new event's _Show on the website_, on by
  default. Cancelled ones stay listed, marked, so nobody turns up to nothing.
- The home page stays prerendered with a placeholder; its script swaps in `/whats-on/`, which renders the same
  component live on the Worker (as the video reel does, [ADR 0019](0019-live-videos.md)). Cached in production
  only ([ADR 0041](0041-caches-in-production-only.md)).
- In the team app, a one-off event has a title, date, start and end, location, a short description, _Show on the
  website_ and _Members say in or out_. People with `update:Event` edit it and cancel or restore it from the
  Calendar. Migration `0013` adds `description` and `cancelled_at` to `club_events`.

## Consequences

- An event added or changed in the app is on the website on the next page load. No publish, no rebuild.
- Without JavaScript the section shows only a link to all events.
- Future training sessions exist only once the team app has made them, 12 weeks ahead, each time it's opened. Until
  a Cron Trigger does it (roadmap T0), the website shows Fridays as long as someone opens the app every few months.
- Two calendars until the rest moves over: the `/events` pages and the Kumite poster still come from Sanity
  `event` documents (roadmap T2: import them once, then retire the type).
