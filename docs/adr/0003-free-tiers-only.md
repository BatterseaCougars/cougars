# 0003. Free tiers only

- **Status:** Accepted
- **Date:** 2026-10-05 (decided at project start) · updated 2026-10-09

## Context

A volunteer-run club pays for this. The old team manager ran a Python solver on a paid server.

## Decision

Every service runs on a free tier: Cloudflare Workers, D1, Cron Triggers and SQLite-backed Durable Objects, Sanity
Free, Bitwarden Secrets Manager Free, GitHub Actions, YouTube for video. The only planned cost is a domain (about £10
a year). Budget and limits: [docs/roadmap.md](../roadmap.md).

A Durable Object is allowed when it stores nothing. Since April 2025 SQLite-backed classes are on the Workers Free
plan (100,000 requests and 13,000 GB-s of duration a day). The live hub, `LiveHub`, holds open streams in memory and
keeps no rows; D1 stays the only source of truth ([ADR 0072](0072-live-updates.md)).

## Consequences

No paid bindings (Cloudflare Images, Durable Objects that store rows), no card-payment provider, no always-on
server. Adding any paid service needs the club's agreement first. Durable Object requests and duration show on the
Usage page and count in its 80% check ([ADR 0059](0059-usage-page-and-check.md)).

## History

- 2026-10-05: Every service on a free tier; no paid bindings, including Durable Objects with storage (0003).
- 2026-10-09: A Durable Object that stores nothing is fine, since SQLite-backed classes became free; the rule now
  reads "Durable Objects that store rows" (0096).
