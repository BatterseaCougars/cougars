# 0076. Training teams: a Session lead role, made by dragging, saved as you change them

- **Status:** Accepted
- **Date:** 2026-10-08 · updated 2026-10-09
- **Merges:** 0079

## Context

Only some people make Friday's teams. The actions already existed (`generate:Teams`, `publish:Teams`,
[0024](0024-action-based-authorization.md)) but only Admin had them, and moving a player meant tapping an arrow to send
them round the teams one at a time.

Teams are made from who's in, but people sign up late or drop out after the teams are out, and the page has to say so
without taking players off a team behind the team maker's back.

## Decision

- **A seeded role, Session lead** (db/seed/club.sql), for whoever runs Friday night: see the calendar, say in or out,
  run the register (`record:Attendance`), see ratings, make and publish teams. One role, not a Door and a Team maker,
  because on a Friday the same person does both. An admin gives it to members on the Roles screen like any other role.
  Moving players needs both `generate:Teams` and `publish:Teams`, since each move is a publish; Session lead and Admin
  have both.
- **No drafts, no Publish.** Every change a team maker makes is saved straight away, and everyone sees it: making the
  teams, remaking them, moving a player, slotting in late sign-ups, and keeping the teams without whoever's out. Each
  save says what happened in the app's save note ("Reno to Cougars"), which shows wherever you've scrolled.
- **Remaking teams that are already out takes a second tap** in Manage, like Remove the teams, because it replaces
  what everyone can see. Making the first ones doesn't.
- **Team makers move players by dragging** a row's grip onto another team, with pointer events so it works with a
  finger as well as a mouse. Enter or Space on the focused grip moves the player to the next team, for keyboards and
  screen readers. **A click or tap on the grip does nothing**: with every move saved, a tap that sent someone to
  another team made them seem to vanish.
- **When the teams stop matching who's in, the page says so**: someone signed up after them (slot them in by rule,
  `slotIn` in lib/snake.ts, or remake), or someone said they're out since (keep the teams as they are without them, or
  remake). Saying out doesn't take a member off a published team: they stay on it, marked Out, until a team maker
  decides. An admin taking someone off the session still takes them off their team.
- The warning takes the place of the In / Waiting / Spaces numbers, over them and the same height, so nothing below
  moves.

## Consequences

- What a team maker sees is what everyone sees. There's no Discard: an accidental move is undone by moving the player
  back.
- Members may see the teams shift while they're being arranged. On a Friday that's a few minutes before the session.
- Each move is one Worker request: a few dozen on a busy night.

## History

- 2026-10-08: A Team maker role; players moved by dragging or a tap on the grip; changes to published teams were a
  draft in the team maker's browser until they pressed Publish, in a banner at the top of the page (was 0076).
- 2026-10-08: Drafts and Publish went: the banner was out of sight of the moves, so a move looked done but wasn't.
  Every change saves at once, a tap on the grip no longer moves anyone, and the warning moved over the counts (was 0079).
- 2026-10-09: Door (the register) and Team maker became one role, Session lead; anyone who had either has it.
