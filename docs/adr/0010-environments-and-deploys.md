# 0010. Two environments on two Cloudflare accounts and two Sanity projects; `main` deploys dev, `release` production

- **Status:** Accepted
- **Date:** 2026-10-05 · updated 2026-10-09
- **Merges:** 0005, 0013, 0017, 0075

## Context

We need somewhere to try things (pull-request previews, merged work, a developer's machine) that can never damage the
live site or its data. A Cloudflare token's D1 rights cover a whole account, so on one account a dev token could write
to the production database. Sanity tokens and members likewise belong to a **project**, not a dataset, so one project
with two datasets would let a dev write token change the live site, and every editor could edit both copies.
gwenda-hackney/ark hit both problems and split into two Cloudflare accounts and two Sanity projects.

A hand-run deploy from a laptop skips the checks and can ship uncommitted work. And merged work needs a stable place to
be checked before it goes live. Ark deploys `main` to dev and production from a `release` branch.

## Decision

|                     | Production                                         | Dev                                                                  |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Cloudflare account  | **Cougars**                                        | **Cougars Dev** (free)                                               |
| Website worker / D1 | `cougars` / `cougars`, at batterseacougars.com     | `cougars-dev` / `cougars-dev`, on workers.dev                        |
| Team app worker     | none until launch                                  | `cougars-team-dev`, on dev's D1                                      |
| Deploys from        | `release`, the daily rebuild, by `deploy.yml` only | `main`, PRs (preview versions), `scripts/deploy-dev.sh`              |
| Secret names        | `NAME__PRODUCTION`                                 | `NAME__DEV`                                                          |
| Bitwarden project   | `cougars`                                          | `cougars-dev` (also holds shared plain `NAME`s)                      |
| GitHub environment  | `production` (`release` only): `cougars-ci`        | `preview` (`main` and PRs): `cougars-ci-dev`, reads dev only         |
| Sanity project      | **Cougars** (`ah165efl`), the hosted Studio        | **Cougars Dev** (`zmg6rbe3`): dev site, PRs, machines, local Studios |
| Content             | Sanity                                             | Sanity, sample content where it's empty; always `noindex`            |

**Deploys** (`.github/workflows/deploy.yml`, which runs the checks, rebuilds D1 from the schema and smoke-tests):

| Trigger                  | Environment | Deploys                                                                         |
| ------------------------ | ----------- | ------------------------------------------------------------------------------- |
| Pull request into `main` | dev         | a preview version of `cougars-dev` (`pr-<n>` alias), linked on the PR           |
| Push to `main`           | dev         | `cougars-dev`, then the team app as `cougars-team-dev`                          |
| Push to `release`        | production  | `cougars` and the hosted Studio                                                 |
| Daily, 04:30 UTC         | production  | `cougars`, rebuilt from `release` ([ADR 0004](0004-astro-workers-sanity-d1.md)) |

- **Never deploy production by hand.** Going live is on purpose: fast-forward `release` to `main`
  (`git push origin main:release`). GitHub enforces it: the `production` environment accepts deployments from
  `release` only, and the `preview` environment holds only the dev Bitwarden token ([ADR 0002](0002-secrets-in-bitwarden.md)).
  `scripts/ci/target.mjs` points a build at one environment; only CI runs it for production.
- A scheduled or dispatched rebuild runs on the default branch, so its only job starts the workflow again on `release`.
  Unreleased code on `main` never goes live by accident.
- We skip Ark's prod-preview-then-promote step: one site, one maintainer.
- **A developer's machine is dev**: `scripts/env-pull.mjs` defaults to `--environment dev`. A production-only secret is
  always `NAME__PRODUCTION`, so the dev token can't see it.
- **The environment picks the Sanity project**, the same way it picks the Cloudflare account: `packages/shared/sanity.ts` maps
  `SITE_ENV=production` to Cougars and everything else to Cougars Dev. Each project has one public dataset,
  `production`. The website build reads `SITE_ENV` (set by `deploy.yml`); the Studio reads `SANITY_STUDIO_SITE_ENV`,
  set to `production` only by the Studio deploy job. Project IDs live in code: they aren't secret (every image URL
  contains one), and public datasets need no read token.
- **The team app deploys to dev only**, in the same job as the site, after the site has rebuilt dev's database and
  seeded the roster (`scripts/ci/target.mjs dev team`). Its secrets come from dev's project (`GMAIL_*`,
  `CLOUDFLARE_ANALYTICS_TOKEN`); a missing one is skipped. `SITE_ENV` is `dev`, so every email goes to the safe address
  ([ADR 0027](0027-email-through-gmail-api.md)). No production deploy, no PR previews and no custom domain for it until
  launch, which gets its own ADR. It deploys with `wrangler deploy`, not a previews-only upload, so the live hub's
  Durable Object migration is applied ([ADR 0072](0072-live-updates.md)).
- **Team-app screens still on demo data are dev-only.** Dues, Fees, Unpaid fees and Upload have no backend yet; the
  bootstrap's `unfinished` flag (true unless `SITE_ENV` is `production`) shows them on dev and locally to try, and
  production leaves them, and every link to them, out ([#63](https://github.com/das974/cougars/issues/63)). Each comes
  back for everyone when its backend lands.
- `DEMO_CONTENT` is never set for production by default; the `production` environment's variable turns it on only
  until real content is in Sanity.

## Consequences

- Two Cloudflare logins, two Sanity projects and their tokens to look after, documented in
  [README.md#secrets](../../README.md#secrets). Webhooks, CORS origins, tokens and members are set up per Sanity
  project ([setup.md](../setup.md#2-sanity-content-editing)); each counts against the free plan separately.
- Each environment has its own database: a PR rebuilds dev, never production. Dev's data is rebuilt on each deploy
  from the schema and seed ([ADR 0050](0050-schema-and-seed-until-launch.md)).
- Merged work lands on the dev site first; production lags until someone pushes `release`.
- A local Studio, a dev build or a dev token can't touch live content. Write tokens will be one per project:
  `SANITY_API_TOKEN__DEV` and `SANITY_API_TOKEN__PRODUCTION`. The team manager sees one Studio, the live one, and
  practises in Cougars Dev, which they're invited to separately. Content doesn't flow between the projects; copying
  live content into dev, if ever wanted, is a script, not a deploy step.
- On dev, the team app's sign-in codes arrive in the dev sending account's inbox, not the member's.
- The dev site is `cougars-dev.<dev subdomain>.workers.dev`; PR previews are aliases on it. Run `scripts/deploy-dev.sh`
  once before the first PR on a fresh account, so the worker exists.

## History

- 2026-10-05: Production deploys only from `main` via `deploy.yml`; design previews on a separate `cougars-preview`
  worker on the same account (0005).
- 2026-10-05: Two environments on two Cloudflare accounts, with one Sanity project and two datasets; `cougars-preview`
  dropped for the dev account (0010, superseding 0005).
- 2026-10-05: `main` deploys dev and `release` production, so merged work has a stable place before it goes live
  (0013).
- 2026-10-05: Two Sanity projects, one per environment, so a dev token can't reach live content (0017).
- 2026-10-05: The Studio publish webhook dropped for a daily production rebuild (ADR 0004).
- 2026-10-08: The team app deploys to dev from `main` as `cougars-team-dev`; no production until launch (0075).
- 2026-10-09: Team-app screens still on demo data (dues, fees, Upload) are hidden in production (#63).
