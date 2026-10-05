# 0010. Two environments, production and dev, on two Cloudflare accounts

- **Status:** Accepted
- **Date:** 2026-10-05
- **Supersedes:** [0005](0005-deploys.md)

## Context

We need somewhere to try things (pull-request previews, design previews, a developer's machine) that can never
damage the live site or its data. A Cloudflare token's D1 rights cover a whole account, so on one account a dev
token could write to the production database. gwenda-hackney/ark hit the same problem and split into two
accounts.

## Decision

|                                               | Production                                         | Dev                                                                    |
| --------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Cloudflare account                            | **Cougars**                                        | **Cougars Dev** (free)                                                 |
| Worker / D1                                   | `cougars` / `cougars`                              | `cougars-dev` / `cougars-dev`                                          |
| Deploys from                                  | `main` and Studio publishes, via `deploy.yml` only | PRs (preview versions, via `deploy.yml`), `scripts/deploy-dev.sh`      |
| Secret names                                  | `NAME__PRODUCTION`                                 | `NAME__DEV`                                                            |
| Bitwarden project                             | `cougars`                                          | `cougars-dev` (also holds shared plain `NAME`s)                        |
| GitHub environment and its `BWS_ACCESS_TOKEN` | `production` (main only): `cougars-ci`, reads both | `preview`: `cougars-ci-dev`, reads `cougars-dev` only                  |
| Sanity dataset                                | `production`                                       | `dev`                                                                  |
| Content                                       | Sanity                                             | Sanity dev dataset; sample content where it is empty; always `noindex` |

- Never deploy production by hand. `scripts/ci/target.mjs` points a build at one environment; only CI runs it
  for production.
- A developer's machine is dev: `scripts/env-pull.mjs` defaults to `--environment dev`.
- A production-only secret is always `NAME__PRODUCTION`, never a plain `NAME`, so the dev token can't see it.

## Consequences

- Two Cloudflare logins and two tokens to look after, documented in
  [README.md#secrets](../../README.md#secrets).
- Each environment has its own database: a PR migrates dev, never production. Migrations stay additive.
- The dev site is `cougars-dev.<dev subdomain>.workers.dev`; PR previews are aliases on it. Run
  `scripts/deploy-dev.sh` once before the first PR, so the worker exists.
