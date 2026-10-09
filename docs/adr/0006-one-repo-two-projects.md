# 0006. One repo, two projects (website and team app); the team generator runs in the browser

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
`marketing/` and `ops/` folders.

## Decision

- **One repo, `das974/cougars`, with npm workspaces, split into two projects:**
  - the website: `apps/web` (Astro site, `@cougars/web`, port 4500) and `apps/studio` (Sanity Studio, port 4520),
    moving to `website/web` and `website/studio` later (#36);
  - the team app: `team/app` (npm workspace `@cougars/team`, port 4510).
- `shared/`, `db/` and `scripts/` stay at the root and serve both.
- **A project never imports another project's files.** Anything both need moves to `shared/`, which stays
  framework-free.
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
- The solver port isn't in yet (#37): `team/app/src/lib/snake.ts` is a greedy stand-in that keeps the old
  solver's rules.
- Moving `apps/` to `website/` touches workspaces, CI, `wrangler.jsonc`, the dev scripts and the docs: one careful
  change, best made when no other stream is open.

## History

- 2026-10-05: One monorepo with `apps/web`, `apps/studio` and a later `apps/ops` (port 4510); the team generator runs
  in the browser on glpk.js (0006).
- 2026-10-06: The team app becomes its own project, `team/app`, beside the website, instead of `apps/ops`; the website
  is to move to `website/` (0021).
- 2026-10-09: The roadmap docs (`docs/roadmap.md`, `docs/roadmap/`) are replaced by GitHub milestones and issues; the
  free-tier budget moved to [0003](0003-free-tiers-only.md).
