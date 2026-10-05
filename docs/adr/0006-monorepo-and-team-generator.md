# 0006. One monorepo; the team generator runs in the browser

- **Status:** Accepted
- **Date:** 2026-10-05 (decided at project start)

## Context

The old team manager (Next.js, Airtable, a Python optimiser on a paid server) picked balanced Friday teams.
We are rebuilding it alongside the new website.

## Decision

- One repo, `das974/cougars`, with npm workspaces: `apps/web`, `apps/studio`, and later `apps/ops` (the
  club's operations app, port 4510). The old app stays in `archive/team-manager/` as read-only reference.
- The team generator uses the existing JavaScript port of the solver (glpk.js,
  `.github/kb/js-solver-port.md`) running **in the browser**, so there is no server to pay for.

## Consequences

Nothing imports from `archive/`. Large drafts are solved on the organiser's phone or laptop, so solver speed
on a phone matters.
