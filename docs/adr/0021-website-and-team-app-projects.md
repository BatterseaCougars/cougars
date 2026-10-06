# 0021. Website and team app are separate projects in one repo

- **Status:** Accepted. Amends [0006](0006-monorepo-and-team-generator.md) (its `apps/ops` layout).
- **Date:** 2026-10-06

## Context

The team app is no longer a small admin tool (`apps/ops`, website roadmap M6–M8). It's a mobile-first app for every
member, with its own stack ([0022](0022-team-app-svelte-pwa.md)), roadmap and release rhythm. Mixing it with the
website under `apps/` blurs which rules apply where (CLAUDE.md's Astro rules don't fit a Svelte SPA).

A separate repo would keep them apart, but the two share a D1 database and its migrations, the Bitwarden and CI
scripts, the Sanity helpers and the Europe/London date code. Gwenda's ark repo solves the same problem with
top-level `marketing/` and `ops/` folders.

## Decision

We will keep one repo and split it into two projects:

- `website/web` (Astro site) and `website/studio` (Sanity Studio), moved from `apps/` in team-app T0.
- `team/app`: the team app (npm workspace `@cougars/team`, port 4510).
- `shared/`, `db/` and `scripts/` stay at the root and serve both.

A project never imports another project's files. Anything both need moves to `shared/`. Each project has its own
roadmap ([docs/roadmap/](../roadmap.md)), Worker and deploy job; both deploy from `main` (dev) and `release`
(production) as before.

## Consequences

- One PR can change a migration and both projects that use it.
- Moving `apps/` touches workspaces, CI, `wrangler.jsonc`, the worktree and dev scripts, and the docs: one careful
  change in T0, best made when no other stream is open.
- Rules in CLAUDE.md have to say which project they apply to.
