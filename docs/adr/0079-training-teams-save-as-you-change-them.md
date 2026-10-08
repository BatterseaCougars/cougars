# 0079. Training teams save as you change them

- **Status:** Accepted. Supersedes the drafts in [0076](0076-team-maker-role.md).
- **Date:** 2026-10-08

## Context

ADR 0076 made a team maker's changes to published teams a draft: kept in their browser until they pressed Publish,
in a banner at the top of the page. Moving players happens further down, among the teams, so the banner was out of
sight. A move looked done but wasn't, and nobody else saw it until someone scrolled up and published.

## Decision

- **No drafts, no Publish.** Every change a team maker makes is saved straight away, and everyone sees it: making
  the teams, remaking them, moving a player (drag, or Enter on the grip), slotting in late sign-ups, and keeping
  the teams without whoever's out.
- Each save says what happened in the app's save note ("Reno to Cougars"), which shows wherever you've scrolled.
- **Remaking teams that are already out takes a second tap** in Manage, like Remove the teams, because it replaces
  what everyone can see. Making the first ones doesn't.
- **A click or tap on the grip does nothing; only a drag moves someone**, or Enter/Space on the focused grip for
  keyboards and screen readers. With every move saved, a tap that sent someone to another team (0076) made them
  seem to vanish.
- When the teams stop matching who's in, the warning takes the place of the In / Waiting / Spaces numbers, over
  them and the same height, so nothing below moves.
- Moving players needs both `generate:Teams` and `publish:Teams`, since each move is a publish. Team maker and Admin
  have both.

## Consequences

- What a team maker sees is what everyone sees. There's no Discard: an accidental move is undone by moving the player
  back.
- Members may see the teams shift while they're being arranged. On a Friday that's a few minutes before the session.
- Each move is one Worker request: a few dozen on a busy night.
