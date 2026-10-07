# 0059. Admins see the free Cloudflare allowance, and are warned at 80%

- **Status:** Accepted. Follows [0058](0058-degrade-instead-of-break.md).
- **Date:** 2026-10-07

## Context

One Cloudflare account runs the website, the team app and their database, on the free plan: 100,000 Worker
requests, 5 million D1 rows read and 100,000 written a day, reset at 00:00 UTC. If one runs out, the team app stops
until then and the website's live pages fail (its prerendered pages are free and keep working). 0058 stops our own
app running away; nothing yet told anyone the allowance was being spent, by a scraper or anything else.

## Decision

- **Settings → Security → Usage** (`read:Usage`; admins have it through `manage:all`) shows today's Worker requests,
  D1 rows read and rows written against the free limits, and when they reset in London time.
- **An hourly check** (the team Worker's cron trigger, free) emails the admins once a day per metric when one passes
  80%, through the usual mail rules (outside production, only to the safe address). `usage_warnings` remembers
  what was sent each day, claimed before sending so two runs send one email.
- Both read Cloudflare's GraphQL analytics with a **read-only token**, `CLOUDFLARE_ANALYTICS_TOKEN` (Account
  Analytics Read), never the deploy token, which shouldn't live in a Worker. Without it the page says how to set it
  up and the check does nothing; if Cloudflare can't be read, the page says so.

## Consequences

- Admins hear about a runaway or a scraper with a fifth of the day left, not when the app stops.
- The check costs 24 Worker requests and two small queries a day.
- It only runs once the team app is deployed; until then the page works on a local dev server started through
  env-pull. Sanity's usage isn't readable through its API, so the page points to sanity.io/manage.
