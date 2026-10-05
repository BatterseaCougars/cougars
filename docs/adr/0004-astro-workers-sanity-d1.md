# 0004. Astro on Cloudflare Workers, content in Sanity, data in D1

- **Status:** Accepted
- **Date:** 2026-10-05 (decided at project start)

## Context

We copy the architecture of gwenda-hackney/ark, simplified. The club needs a fast promo site that a
non-developer can edit, plus a small amount of server logic (the join form now; attendance, payments and
Kumite scoring later).

## Decision

- **Astro** with `@astrojs/cloudflare`, deployed as a **Cloudflare Worker with static assets**, not Pages:
  Cloudflare now steers new projects to Workers, and one Worker serves prerendered pages and the few server
  routes (`prerender = false`) together.
- **Sanity** (free plan) holds editable content. The site reads it at build time; a publish triggers a rebuild.
  The site still builds without Sanity, from `fallback.ts`.
- **D1** holds operational data. Plain SQL through `shared/d1.ts`, no ORM. Migrations are additive.

## Consequences

Content changes need a rebuild (about 2 minutes). Server routes run in workerd, so Node-only libraries don't
work there. Editors only ever touch the Studio.
