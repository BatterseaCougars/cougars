# D1 database

One database, `cougars`, bound as `DB` in `apps/web/wrangler.jsonc`.

## Migrations

- Plain SQL in `db/migrations/NNNN_description.sql`, applied in CI with
  `wrangler d1 migrations apply DB --remote -c dist/server/wrangler.json` (the built config, which
  names the right database for each environment) before every deploy.
- Local: `npm run db:migrate:local` (state lives in `apps/web/.wrangler/`).
- **Additive only.** Never edit a migration that has run. Removing or renaming
  a column = new table/column + backfill + drop in a later migration.

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
