# 0017. Two Sanity projects, one per environment

- **Status:** Accepted. Amends [0010](0010-two-environments.md) (its Sanity dataset row) and
  [0014](0014-sanity-public-content.md) (its live/practice workspaces).
- **Date:** 2026-10-05

## Context

[ADR 0010](0010-two-environments.md) gave production and dev one Sanity project with two datasets,
`production` and `dev`, and [ADR 0014](0014-sanity-public-content.md) showed them as two workspaces in one
Studio. Sanity tokens and members belong to a **project**, not a dataset. Today the only token is read-only, so
that is harmless, but the team app (roadmap M6) will need a write token: with one project, a dev write token could
change the live site, and every editor could edit both copies.

Gwenda (the project this repo follows) hit the same thing and moved to two projects, Gwenda Web and Gwenda Dev,
each with one dataset, so dev runs exactly the production flow and can never reach the real content.

## Decision

We will have two free Sanity projects, each with one public dataset named `production`:

- **Cougars** (`ah165efl`): the live site and the hosted Studio, deployed from `release`.
- **Cougars Dev** (`zmg6rbe3`): the dev site, PR previews, developers' machines and local Studios.

The environment picks the project, the same way it picks the Cloudflare account: `shared/sanity.ts` maps
`SITE_ENV=production` to Cougars and everything else to Cougars Dev. The website build reads `SITE_ENV`
(set by `deploy.yml`); the Studio and its scripts read `SANITY_STUDIO_SITE_ENV`, set to `production` only by the
Studio deploy job. Project IDs live in code, not Secrets Manager: they aren't secret (every image URL contains
one). Public datasets need no read token, so `SANITY_API_TOKEN`, `SANITY_PROJECT_ID` and `SANITY_DATASET__DEV`
are no longer secrets to create.

## Consequences

- A local Studio, a dev build or a dev token can't touch live content. Write tokens (M6) will be one per
  project: `SANITY_API_TOKEN__DEV` and `SANITY_API_TOKEN__PRODUCTION`.
- The team manager sees one Studio, the live one. Practising happens in Cougars Dev, which they're invited to
  separately.
- Content doesn't flow between the projects. Copying live content into dev, if it's ever wanted, is a script
  (export and import with the developer's own login), not a deploy step.
- Webhooks, CORS origins, tokens and members are set up per project ([setup.md](../setup.md#2-sanity-content-editing)).
- Both projects count against the free plan separately (each gets its own seats, documents and requests).
