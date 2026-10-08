# 0075. The team app deploys to dev from main

- **Status:** Accepted. Amends [0022](0022-team-app-svelte-pwa.md) ("not deployed until sign-in exists").
- **Date:** 2026-10-08

## Context

The team app ran only on a local dev server. Sign-in by emailed code now exists, so it can be tried by others, but
it's not ready for the club: production would mean real members getting real email from an app still changing daily.

## Decision

- **A push to `main` deploys it to dev** as its own worker, `cougars-team-dev`, on the Cougars Dev account and the
  site's dev database (`cougars-dev`), in the same deploy job as the site, after the site has rebuilt that database
  from the schema and seeded the roster (`scripts/ci/target.mjs dev team`).
- Its secrets come from dev's Secrets Manager project, like the site's: `GMAIL_*` (sign-in codes) and
  `CLOUDFLARE_ANALYTICS_TOKEN` (Usage). A missing one is skipped. `SITE_ENV` is `dev`, so every email goes to the safe
  address (shared/email.ts), not to the member.
- **No production deploy, no PR previews, no custom domain** yet: it stays on workers.dev until launch, which gets its
  own ADR.

## Consequences

- Dev's data is rebuilt on each deploy (ADR 0050), so what's entered on dev doesn't last past the next push.
- On dev, sign-in codes arrive in the dev sending account's inbox, not the member's.
