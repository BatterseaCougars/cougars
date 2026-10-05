# 0005. Production deploys only from `main`; design previews on their own worker

- **Status:** Superseded by [0010](0010-two-environments.md)
- **Date:** 2026-10-05

## Context

A hand-run deploy from a laptop skips the checks and can ship uncommitted work. But design work needs a URL
people can look at before it is merged.

## Decision

- **Production** (`cougars` worker) deploys only from `main` via `.github/workflows/deploy.yml`, which runs the
  checks, migrations and a smoke test. Pull requests get a preview version of the same worker.
- **Design previews** go to a separate worker, `cougars-preview`, with its own D1 database, via
  `scripts/deploy-preview.sh`. They build with sample content (`DEMO_CONTENT=true`) and are `noindex`. They
  live on the same Cloudflare account as production, next to the `cougars` worker.

## Consequences

Never run `wrangler deploy` against `cougars` by hand. Sample content can't reach production: CI never sets
`DEMO_CONTENT`.
