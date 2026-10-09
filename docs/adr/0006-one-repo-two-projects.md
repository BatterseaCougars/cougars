# 0006. One repo: the apps in apps/, shared code in packages/; the team generator runs in the browser

- **Status:** Accepted
- **Date:** 2026-10-05 (decided at project start) · updated 2026-10-09
- **Merges:** 0021

## Context

The old team manager (Next.js, Airtable, a Python optimiser on a paid server) picked balanced Friday teams. We are
rebuilding it alongside the new website, as the team app: a mobile-first app for every member, with its own stack
([ADR 0022](0022-team-app-svelte-pwa.md)), plan and release rhythm. Mixing it with the website blurs which rules
apply where (CLAUDE.md's Astro rules don't fit a Svelte SPA).

A separate repo would keep them apart, but the two share a D1 database and its schema, the Bitwarden and CI scripts,
the Sanity helpers and the Europe/London date code. Gwenda's ark repo solves the same problem with top-level
`marketing/` and `ops/` folders; most monorepos use `apps/` for what deploys and `packages/` for what they share.

## Decision

- **One repo with npm workspaces**, laid out the usual way:
  - `apps/` holds what deploys, each its own workspace: `apps/web` (the Astro site, `@cougars/web`, port 4500),
    `apps/studio` (Sanity Studio, `@cougars/studio`, port 4520) and `apps/team` (the team app, `@cougars/team`, port
    4510).
  - `packages/shared` (`@cougars/shared`) is the framework-free code both use, imported by name
    (`@cougars/shared/d1`), never by a relative path.
- `db/` and `scripts/` stay at the root and serve both.
- **An app never imports another app's files.** Anything both need moves to `packages/shared`, which stays
  framework-free. (Use-case tests are the exception: the team app's may read through the website's modules, to show
  what a visitor sees.)
- Each project has its own Worker and deploy step
  ([ADR 0010](0010-environments-and-deploys.md)). Rules in CLAUDE.md say which project they apply to.
- **The roadmap is GitHub milestones**, not a doc: each milestone is prefixed with its project (`Website:` or
  `Team app:`; `Housekeeping` is for both), and every piece of work is an issue in one. A checklist in a doc went stale as soon as work moved
  faster than it was ticked.
- The old app stays in `archive/team-manager/` as read-only reference. Nothing imports from `archive/`.
- **The team generator runs in the browser**, on a JavaScript port of the solver (glpk.js,
  `.github/kb/js-solver-port.md`), so there is no server to pay for ([ADR 0003](0003-free-tiers-only.md)).

## Consequences

- One PR can change the schema and both projects that use it.
- Large drafts are solved on the organiser's phone or laptop, so solver speed on a phone matters.
- The solver port isn't in yet (#37): `apps/team/src/lib/snake.ts` is a greedy stand-in that keeps the old
  solver's rules.
- A new app goes in `apps/`; code a second app needs moves to `packages/`, as a package of its own if it grows.

## History

- 2026-10-05: One monorepo with `apps/web`, `apps/studio` and a later `apps/ops` (port 4510); the team generator runs
  in the browser on glpk.js (0006).
- 2026-10-06: The team app becomes its own project, `team/app`, beside the website, instead of `apps/ops`; the website
  is to move to `website/` (0021).
- 2026-10-09: The roadmap docs (`docs/roadmap.md`, `docs/roadmap/`) are replaced by GitHub milestones and issues; the
  free-tier budget moved to [0003](0003-free-tiers-only.md).
- 2026-10-09: The website stays in `apps/` and the team app joins it (`apps/team`); `shared/` becomes the workspace
  package `packages/shared` (`@cougars/shared`). The move to `website/` is dropped (#36).
