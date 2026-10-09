# 0090. A game has a matchup page, and Live for everyone

- **Status:** Accepted. Amends [0071](0071-scoring-games-live.md).
- **Date:** 2026-10-09

## Context

A game's Details on the fight card opened the scorekeeper's page: the clock, the scoresheet and the live score. That's
the right page for whoever keeps time and score, not for someone who wants to know who's playing. Starting a game on
another day than the tournament's (a test, or a Kumite brought forward) quietly scored it against the wrong day.

## Decision

- **Details opens the matchup** (`/tournaments/:slug/games/:id`, Matchup.svelte, under the fight card): the two teams
  face to face (crest, name, record so far; the score once there is one, else the kick-off), both squads in full,
  the goals once it's played, and **when the captains' sides last met** in past ones of the series (lib/matchups.ts:
  games where one was on each side, as captain or player; teams are drafted afresh, so it's the people who carry
  over).
- **Live is the same button for everyone** (`/games/:id/live`, Game.svelte), on each fight card row still to be
  played and on the matchup: the clock, the score and the goals as they go in, whether you're at the rink or
  following from home.
- **Keeping score is taken on there, on purpose**: under the clock it says who's keeping score, or "Nobody's keeping
  score" with a Keep score button. It's never the page's big button, so someone following from home can't take it by
  accident. The one who takes it holds it (the big yellow Start the game, Pause, Goal, Full time) until they **Hand
  over**, which is on the page, not in its tools; an admin can still make them let go.
- **Starting the first game on another day asks first**: "The Kumite is on Fri 30 Oct. Start this game now? Its day
  moves to today, and its times so this game starts now." Yes moves the tournament (its day, its hours so this game
  kicks off now, the day as long as before; its sign-up and draft days no later than the new day, lib/fixtures.ts
  `startingNow`), then starts the clock.

## Consequences

- A link to a game's live score is `/live`; the home page's keep-score duty goes there.
- Moving the day is the same tournament save an admin makes in its settings; nothing new on the server.
