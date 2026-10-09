# D1 database

One database, `cougars`, bound as `DB` in `apps/web/wrangler.jsonc`.

## Schema and seed (until launch)

Not live yet, so there are no migrations ([ADR 0050](../docs/adr/0050-schema-and-seed-until-launch.md)):

- `db/schema.sql` is the whole database: every table and index. Change it directly.
- `db/seed/club.sql` is what it starts with that isn't about anyone (roles, Friday Training, the Kumite series,
  quips): `INSERT OR IGNORE` by id, so it never overwrites what admins changed. People come from the roster
  ([seed/README.md](seed/README.md)).
- `scripts/db-rebuild.mjs` rebuilds a database from the schema **keeping its data**: rows are read out (and backed
  up to a private temp file), the tables are made again, the rows go back (new columns take their defaults), then
  the club seed tops up. Local: `npm run db:rebuild:local`. Dev: every deploy (`.github/workflows/deploy.yml`), or
  `node scripts/env-pull.mjs -- bash scripts/deploy-dev.sh`.
- Production starts fresh: schema, club seed, and a roster of just its admins, who bring the members in with Import
  members in the team app ([ADR 0050](../docs/adr/0050-schema-and-seed-until-launch.md)). At launch `schema.sql`
  becomes the first migration. From then on, migrations, additive only.

## Conventions

- `snake_case` tables and columns, plural table names.
- `INTEGER PRIMARY KEY AUTOINCREMENT` ids.
- Timestamps: ISO-8601 TEXT, `*_at` for instants (UTC, `Z`), `*_on` for dates (`YYYY-MM-DD`).
- Money: INTEGER pence, columns end in `_pence`.
- Booleans: INTEGER 0/1. Structured blobs: JSON in TEXT.
- Status columns are free TEXT documented in a comment (no CHECK constraints,
  so adding a status never needs a table rebuild).
- Index every column used in a WHERE or ORDER BY on a growing table.
- Free plan limits: 5 GB, 5M rows read/day, 100 bound parameters per query.
