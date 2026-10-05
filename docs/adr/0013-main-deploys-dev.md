# 0013. `main` deploys dev; `release` deploys production

- **Status:** Accepted
- **Date:** 2026-10-05
- **Supersedes:** the "Deploys from" row of [0010](0010-two-environments.md)

## Context

[ADR 0010](0010-two-environments.md) deployed production on every merge to `main`, so the dev site only ever
showed PR previews and there was no stable place to check merged work before it went live. gwenda-hackney/ark
deploys `main` to dev and production from a `release` branch.

## Decision

| Trigger                  | Environment | Deploys                                              |
| ------------------------ | ----------- | ---------------------------------------------------- |
| Pull request into `main` | dev         | a preview version of `cougars-dev`, linked on the PR |
| Push to `main`           | dev         | `cougars-dev`                                        |
| Push to `release`        | production  | `cougars`                                            |
| Studio publish (webhook) | production  | `cougars`, rebuilt from `release`                    |

- Going live is on purpose: fast-forward `release` to `main` (`git push origin main:release`).
- GitHub enforces it: the `production` environment accepts deployments from `release` only. Dev deploys (`main`
  and PRs) use the `preview` environment, which holds only the dev Bitwarden token.
- We skip Ark's prod-preview-then-promote step: one site, one maintainer.

## Consequences

- Merged work lands on the dev site first; production lags until someone pushes `release`.
- A Studio publish rebuilds `release`, so unreleased code on `main` never goes live by accident.
