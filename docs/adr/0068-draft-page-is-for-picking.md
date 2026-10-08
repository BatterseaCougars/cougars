# 0068. The draft page is for picking: End turn sends a pick, teams are edited on their own page

- **Status:** Accepted. Amends [0066](0066-draft-and-fixtures-are-independent.md) (where a team is edited) and
  [0060](0060-draft-lifecycle.md) (how a captain picks).
- **Date:** 2026-10-08

## Context

The Draft page carried a captain's picking and an admin's team editing side by side, and a single tap on Pick sent
the pick straight away: one mis-tap on a busy phone and the wrong player was gone, visible to the room.

## Decision

- **Picking is two steps.** Pick marks a player on your screen (tap another to change your mind); **End turn** sends
  it. Nothing changes for anyone else until then, so the server is unchanged: a pick is still one request. Whoever
  runs the draft picks for the captain on the clock the same way.
- **Teams are edited on a Teams page** (`/tournaments/:slug/teams`, `manage:Tournament`): every team and its players,
  Edit opening the team drawer over it, the crest its name and logo. The Draft page shows teams but doesn't edit them.
  Putting someone in the tournament (Add player) stays on the Draft page, as part of running the draft.

## Consequences

- A captain who picks and walks away holds the draft until they end their turn; whoever runs it can pick for them.
- The Teams page is admins' for now; it could open to everyone once the teams are set.
