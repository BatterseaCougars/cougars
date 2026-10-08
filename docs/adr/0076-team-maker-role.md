# 0076. Team maker: a role for making training teams, by dragging

- **Status:** Accepted. Its drafts are superseded by [0079](0079-training-teams-save-as-you-change-them.md): changes save at once.
- **Date:** 2026-10-08

## Context

Only some people make Friday's teams. The actions already existed (`generate:Teams`, `publish:Teams`, ADR 0024) but
only Admin had them, and moving a player meant tapping an arrow to send them round the teams one at a time.

## Decision

- **A seeded role, Team maker** (db/seed/club.sql): see the calendar, say in or out, see ratings, make and publish
  teams. An admin gives it to members on the Roles screen like any other role.
- **Team makers move players by dragging** a row's grip onto another team: pointer events, so it works with a finger
  as well as a mouse. A tap (or Enter) on the grip moves the player to the next team, for keyboards and screen
  readers.
- **Moving players on published teams starts a draft** from them; nothing changes for anyone else until a team
  maker publishes. The draft can be discarded.
- **When the teams stop matching who's in, the page says so** in one banner at the top: someone signed up after
  them (slot them in by rule, `slotIn` in lib/snake.ts, or remake), or someone said they're out since (keep the teams
  as they are without them, or remake). Saying out no longer takes a member off a published team: they stay on it,
  marked Out, until a team maker decides. An admin taking someone off the session still takes them off their team.
- The banner and the draft banner that replaces it share one slot of the same height, so nothing below moves.

## Consequences

- Draft teams live in the team maker's browser until published: another team maker doesn't see them.
