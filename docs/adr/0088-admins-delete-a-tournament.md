# 0088. An admin deletes a tournament, with everything that's its

- **Status:** Accepted.
- **Date:** 2026-10-09

## Context

A tournament scheduled by mistake (or for testing the scheduling story, ADR 0087) couldn't be removed: the app had no
delete for one.

## Decision

- **Delete is in the tournament's editor** (Settings → Tournaments, or Edit from its page): a quiet red Delete at
  the start of the footer. Tapping it asks in the footer, in so many words ("Delete it? Its teams, sign-ups and
  results go too."), with Keep it and a red Delete, the one red fill.
- **The database deletes it, not the Worker** (`DELETE /api/tournaments/:id`, `manage:Tournament`): one
  `DELETE FROM tournaments`, and the schema's `ON DELETE CASCADE`s take its sign-ups, teams and their players, games
  and goals, and the awards' winners. D1 enforces foreign keys, as does the SQLite the tests use. This is
  [ADR 0063](0063-cpu-time-on-the-usage-page.md)'s rule: work the database can do stays in the database, not in a
  Worker's CPU time.
- **Its agenda rows go by syncing it away.** The agenda points at a tournament by `source` and `source_id`, with no
  foreign key, so the Worker removes them; it leaves the website's What's on and the app's calendar.

## Consequences

- There's no undo. A played tournament's results go with it, so the question says so.
- A new table that belongs to a tournament needs `ON DELETE CASCADE` to its tournament (or its team or game), or a
  delete leaves it behind; the use-case test checks no team's players are left over.
