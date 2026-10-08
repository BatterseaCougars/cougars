# 0066. The draft and the fixtures are independent; a closed draft can reopen

- **Status:** Accepted. Amends [0060](0060-draft-lifecycle.md) (closed was final), [0061](0061-fixtures-and-playoffs.md)
  (fixtures waited for the draft to close) and [0064](0064-reset-a-draft.md) (a reset took the fixtures and was refused
  after a result).
- **Date:** 2026-10-07

## Context

A drafted tournament's teams exist as soon as it has captains: Team Dan plays Team Adrian whoever ends up on them.
Tying the fixtures to the draft's end meant the schedule couldn't be shown until draft night, and closing a draft by
mistake (or a late sign-up after it closed) left no way back short of a reset that wiped the fixtures too.

## Decision

- **Fixtures need two teams, nothing more.** A draft's captains are its teams; the fixtures can be made before, during
  or after the draft, and remade until a game has a result (0061's rule for remaking stands).
- **A closed draft reopens** (`run:Draft`), keeping its picks: the captain on the clock is whoever's next, as if it had
  never closed. Close it again as before.
- **A reset only takes the picks off.** Sign-ups, captains and fixtures stay; it's no longer refused after a result.
- Adding a player to a closed draft is still refused: reopen it first.

## Consequences

- The Games page offers "Make the fixtures" as soon as there are two captains.
- Resetting after games have been played empties the teams' rosters while their results stand; the app asks first.
