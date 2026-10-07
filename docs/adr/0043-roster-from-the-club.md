# 0043. The website's roster is a build-time snapshot of the club's members, refreshed per card

- **Status:** Accepted. Replaces Sanity `player` documents as the roster's source (there were none).
- **Date:** 2026-10-07

## Context

The website's squad cards (home page and `/team/`) read Sanity `player` documents, and there were none, so they
showed samples. The real roster is the team app's `members` in D1 ([ADR 0033](0033-personal-data-out-of-the-repo.md):
personal data, never in the repo). It changes rarely, so a rebuild is fine, but a player who changes their details
in the app shouldn't have to wait for one to see them.

## Decision

- **Snapshot at build.** `scripts/club-snapshot.mjs` runs before `astro dev` and `astro build` (apps/web's
  `predev`/`prebuild`). It reads the active Cougars (the `cougar` flag) from the environment's D1 (local D1 on a laptop; in CI, the
  D1 API with `CLUB_SNAPSHOT_ENV`) into `apps/web/src/data/roster.local.json` (the club snapshot also takes the Kumite's awards, [ADR 0044](0044-tournament-awards-in-the-app.md)), gitignored. If it can't read the
  database the roster is empty and the site falls back to Sanity players or the samples; a build never fails on it.
- **Only what the website shows leaves the database:** the member's name as they chose it on their app profile
  (_Name on the website_: first name and initial, the default; full name; first name; or a nickname; stored in
  `members.web_name`, migration `0014`), position and bio.
- **Player stats** under the cards on `/team/`: training sessions played this year and in all, and tournaments
  played, counted as the team app counts them (signed up, not marked a no-show, not cancelled). They're part of the
  snapshot, so they're as of the last build (`scripts/lib/roster-sql.mjs`).
- **Picked up, as in the app.** Pressing a card lifts a copy to the middle of the screen, big enough to read,
  turning to its back on the way; it's put back with Close, the scrim or Escape. Picking it up fetches
  `/api/players/<id>` (live from D1, active Cougars only) and changes whatever differs: name, position, bio.

## Consequences

- A new or departed Cougar shows after the next build (daily in production, [ADR 0018](0018-rebuilds-until-team-app.md));
  a changed name, bio or position shows as soon as someone picks up that card. Locally, re-run the snapshot.
- Each Cougar decides how their name appears; nobody's full name is published unless they choose it.
- Photos, shirt numbers and nicknames aren't in D1 yet, so roster cards show the club logo and no number.
