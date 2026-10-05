# 0005. Production deploys only from `main`; design previews on their own worker

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

A hand-run deploy from a laptop skips the checks and can ship uncommitted work. But design work needs a URL
people can look at before it is merged.

## Decision

- **Production** (`cougars` worker) deploys only from `main` via `.github/workflows/deploy.yml`, which runs the
  checks, migrations and a smoke test. Pull requests get a preview version of the same worker.
- **Design previews** go to a separate worker, `cougars-preview`, with its own D1 database, via
  `scripts/deploy-preview.sh`. They build with sample content (`DEMO_CONTENT=true`) and are `noindex`. They
  can run on a different Cloudflare account (`CLOUDFLARE_API_TOKEN__DESIGN`, see the README).

## Consequences

Never run `wrangler deploy` against `cougars` by hand. Sample content can't reach production: CI never sets
`DEMO_CONTENT`.
