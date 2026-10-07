# 0045. The events page reads the club calendar live

- **Status:** Accepted. Extends [0042](0042-whats-on-from-the-club-calendar.md) from the home page to `/events`.
- **Date:** 2026-10-07

## Context

The home page's What's on reads D1 live and links to "All events", but `/events` still listed Sanity `event`
documents. With the calendar kept in the team app, that page was empty (or out of date) while the home page wasn't.

## Decision

- `/events` is rendered live on the Worker (`prerender = false`) and lists everything coming up from D1 with the same
  component as the home page (`components/WhatsOn.astro`): the next 4 training sessions (they're every week) and
  every public tournament and one-off event. Cached in production only ([ADR 0041](0041-caches-in-production-only.md)).
- Past events with their own pages (`/events/<slug>`) still come from Sanity, listed below, until they move over
  (roadmap T2).

## Consequences

- The home page and `/events` always agree; a change in the app shows on both on the next page load.
- `/events` costs a D1 read per uncached request, like `/whats-on`.
- If D1 fails, the page says the calendar didn't load and points to Fridays, and still shows past events.
