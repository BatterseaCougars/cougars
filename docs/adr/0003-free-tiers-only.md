# 0003. Free tiers only

- **Status:** Accepted
- **Date:** 2026-10-05 (decided at project start)

## Context

A volunteer-run club pays for this. The old team manager ran a Python solver on a paid server.

## Decision

Every service runs on a free tier: Cloudflare Workers, D1 and Cron Triggers, Sanity Free, Bitwarden Secrets
Manager Free, GitHub Actions, YouTube for video. The only planned cost is a domain (about £10 a year).
Budget and limits: [docs/roadmap.md](../roadmap.md).

## Consequences

No paid bindings (Cloudflare Images, Durable Objects with storage), no card-payment provider, no always-on
server. Adding any paid service needs the club's agreement first.
