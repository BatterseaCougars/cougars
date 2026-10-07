# 0060. A captains' draft is opened and closed by an admin

- **Status:** Accepted. Supersedes the draft parts of [0052](0052-tournament-types-and-teams.md).
- **Date:** 2026-10-07

## Context

The first draft (0052) let captains pick from midnight on the draft day, forever, with no end. Captains could be
picked, a member who withdrew stayed on their team, and saving the tournament's editor rewrote every team: picks made
while it was open were lost, team ids changed (so Undo took the wrong pick), and reordering captains mid-draft broke
the turn order.

## Decision

- `tournaments.draft_state`: none → (scheduled: a day and captains) → **open** → **closed**. An admin (`run:Draft`)
  opens it on the night and closes it; nothing happens on its own.
- Picks only while it's open, from members who said they're in. **Captains are in automatically**, on their own team,
  and never in the pool.
- Closing needs everyone picked, or the admin choosing to leave the rest out. Closed locks the picks and the captains;
  the teams go into the fixtures (ADR 0061).
- Each pick has a `pick_number`: turn order (snake) and Undo follow it.
- The editor changes teams **in place** (by id), never writes a draft's players, and can't change the captains or
  their order once the draft is open. A save without some rules keeps the tournament's own, not the series'.
- Withdrawing while the draft is open takes a pick off their team; once it's closed, or for a captain, it goes through
  an admin.

## Consequences

- A draft can't be left half-open or rewritten by a stale editor.
- The draft night is on the agenda (ADR 0062) for its captains and the admins until it's closed.
