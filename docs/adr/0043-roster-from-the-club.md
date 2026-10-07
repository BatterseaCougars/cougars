# 0043. The website's roster is a build-time snapshot of the club's members, refreshed per card

- **Status:** Accepted. Replaces Sanity `player` documents as the roster's source (there were none).
- **Date:** 2026-10-07

## Context

The website's squad cards (home page and `/team/`) read Sanity `player` documents, and there were none, so they
showed samples. The real roster is the team app's `members` in D1 ([ADR 0033](0033-personal-data-out-of-the-repo.md):
personal data, never in the repo). It changes rarely, so a rebuild is fine, but a player who changes their details
in the app shouldn't have to wait for one to see them.

## Decision

- **Snapshot at build.** `scripts/roster-snapshot.mjs` runs before `astro dev` and `astro build` (apps/web's
  `predev`/`prebuild`). It reads active members from the environment's D1 (local D1 on a laptop; in CI, the
  D1 API with `ROSTER_SNAPSHOT_ENV`) into `apps/web/src/data/roster.local.json`, gitignored. If it can't read the
  database the roster is empty and the site falls back to Sanity players or the samples; a build never fails on it.
- **Only what the website shows leaves the database:** first name and last initial ("Adrian K."), position and bio.
  Active members, the Cougars first.
- **Refreshed per card.** Flipping a roster card fetches `/api/players/<id>` (live from D1, active members only)
  and changes whatever differs: name, position, bio.

## Consequences

- A new or departed player shows after the next build (daily in production, [ADR 0018](0018-rebuilds-until-team-app.md));
  a changed bio or position shows as soon as someone flips that card.
- Names are published without anyone being asked. If that's not wanted, a member-level "show me on the website"
  flag is the next step.
- Photos, shirt numbers and nicknames aren't in D1 yet, so roster cards show the club logo and no number.
