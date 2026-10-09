# 0050. Until launch, the database is a schema and a seed, not migrations

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Every change to the database was a numbered migration: sixteen of them before anything went live, several only
adding one column, some fixing the one before. Nothing is live (there's no `release` branch; production has never
been deployed), so nobody's data needs migrating. What matters is the dev database: the club's members, schedule and
settings, entered in the app, which will become production.

## Decision

- Until launch, `db/schema.sql` is the database: every table and index, changed directly. `db/seed/club.sql` holds
  what it starts with that isn't personal (roles, Friday Training, the Kumite series, quips), `INSERT OR IGNORE` by
  id. The roster stays in Secrets Manager (ADR 0029).
- `scripts/db-rebuild.mjs` rebuilds a database from the schema and keeps its data: it reads every row out (backing
  them up to a private temp file), drops the tables, makes them again, puts the rows back (a new column takes its
  default; a column that's gone is dropped and said so), and tops up the club seed. Local runs it with
  `npm run db:rebuild:local`; dev runs it on every deploy, in place of `wrangler d1 migrations apply`.
- Tests build their database from the same schema and seed.
- **Production starts fresh, not as a copy of dev.** Its first deploy builds it from the schema and the club seed, and
  the roster (`TEAM_ROSTER__PRODUCTION`) holds only the admins. They bring the members in with Import members
  ([0069](0069-members.md)). Dev keeps its data for trying things.
- At launch `schema.sql` becomes the first migration, and from then on changes are migrations again, additive only
  (the rule before this ADR).

## Consequences

- A schema change is one edit; local and dev pick it up with their data intact.
- A rebuild rewrites every row, so it's for a small database: fine for one club before launch, not after.
- Renaming a column loses that column's data in a rebuild (it's read out under the old name): copy it across by hand
  in the same change, or don't rename before launch.
- The old migrations are gone from the tree; git history has them.

## History

- 2026-10-07: Until launch, the database is a schema and a seed, not migrations.
- 2026-10-09: Production starts fresh (schema, club seed, its two admins) and is filled by an import, instead of
  becoming a copy of dev's data.
