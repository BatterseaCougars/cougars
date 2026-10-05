# 0012. Two Secrets Manager projects, shared by every app

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

Ark gives each app its own pair of Secrets Manager projects (`ark` / `ark-dev`, `ark/web` / `ark/web-dev`,
`ark/ops` / `ark/ops-dev`), so ownership is visible in Bitwarden. We'll have at least two apps: the website and a
mobile app for the team. Bitwarden's free plan allows **3 projects** and **3 machine accounts**, and we stay on
free tiers ([ADR 0003](0003-free-tiers-only.md)), so Ark's six projects don't fit.

## Decision

1. **Two projects, for every app:** `cougars` (production, `NAME__PRODUCTION`) and `cougars-dev` (dev
   `NAME__DEV` and shared `NAME` values). The production/dev split from [ADR 0002](0002-secrets-in-bitwarden.md)
   and [ADR 0010](0010-two-environments.md) is the one that keeps production safe, so that is the one we keep.
2. **Ownership is recorded in the README**, not in project names: the _Used by_ column of
   [README.md#secrets](../../README.md#secrets) says which app uses each secret.
3. **Three machine accounts:** `cougars-ci` (reads both, GitHub environment `production`), `cougars-ci-dev` (reads
   `cougars-dev`, GitHub environment `preview`), and `cougars-local` (reads and writes both, for the maintainer's machine; CI is read-only). New
   apps share them. Their tokens are `BWS_ACCESS_TOKEN__PRODUCTION`, `BWS_ACCESS_TOKEN__DEV` and
   `COUGARS_LOCAL_BW_TOKEN` (like Ark's `ARK_LOCAL_BW_TOKEN`), so each is named for where it's used.
4. The third project slot stays free.

## Consequences

- Any CI job with the production token can read every app's production secrets, not just its own. Acceptable
  for a two-app club project.
- Upgrading later (Teams plan) to Ark's per-app pairs is moving secrets between projects: the loader merges every
  project its token can read and looks secrets up by name, so code and secret names don't change.
