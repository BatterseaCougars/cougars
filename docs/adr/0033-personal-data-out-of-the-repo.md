# 0033. Personal data stays out of the repo; the roster is seeded from Secrets Manager

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The team app starts with the club's 27 players: names, positions and skill ratings, plus who is an admin and an
email to sign in with. The repo is public, and git history keeps whatever was ever committed. A migration is the
obvious place for seed data, but a migration with names and ratings in it would publish them for good. Keeping the
repo public matters too: public repos get unlimited GitHub Actions minutes, a private one gets 2,000 a month on the
free plan (ADR 0003).

The data also has to reach dev and production without anyone running commands against production by hand (CLAUDE.md).

## Decision

We will keep personal data out of the repo entirely, and seed it from Secrets Manager.

- **Migrations seed only what isn't about people:** roles and their actions, Friday Training, the Kumite.
- **The roster** is one line of JSON stored as `TEAM_ROSTER` (dev) and `TEAM_ROSTER__PRODUCTION` in Bitwarden,
  the same as a secret ([README.md#team-roster](../../README.md#team-roster)), and on a laptop as
  `db/seed/roster.local.json`, which git ignores.
- **`scripts/seed-roster.mjs` only adds:** players not yet in `members` (matched by name, any case), an email
  where there's none, roles where they're missing. It never changes or removes anyone, so it runs on every deploy
  after the migrations, and what admins do in the app always wins.
- Anything else personal that ever needs seeding follows the same path.

## Consequences

- Names, ratings and emails never appear in the repo, its history, or CI logs (the value is masked).
- Production gets the roster the same way dev does, through `deploy.yml`, with nothing run by hand.
- The roster in Secrets Manager drifts from D1 once admins edit members in the app. That's fine: it's only the
  starting list, and re-seeding never overwrites. Renaming someone in the app and then re-seeding would add their
  old name back as a new member; edit the roster too if that happens before the roster is retired.
- Two copies to keep in step while the roster matters: the local file and Secrets Manager (both names).
- Seeding by name assumes no two players share a name; the seed refuses a roster that lists one twice.
