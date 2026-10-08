# 0073. The champions and the awards come from the results; an admin confirms them

- **Status:** Accepted. Follows [0044](0044-tournament-awards-in-the-app.md) (the awards themselves) and
  [0061](0061-fixtures-and-playoffs.md) (fixtures and playoffs).
- **Date:** 2026-10-08

## Context

The awards a tournament gives out (Champions, Top scorer, Best goalie, the Dim Mak) were set in the app, but not who
won them; that stayed in Sanity. And nothing in the app said who'd won the tournament.

## Decision

- **The champions are worked out, not entered** (`champion` in `lib/fixtures.ts`): with playoffs, whoever wins the
  last one (the final); without, the top of the table once every game's played. A drawn final crowns nobody until a
  result settles it. They're shown loud on the tournament's home and the board (`ChampionCard`), and marked in the
  table.
- **Who won each award is the admins' call** (`tournament_award_winners`, `worker/awards.ts`): a team or a player on
  one of the tournament's teams, for one of its own awards, the whole list set at once (`PUT
/api/tournaments/:id/winners`, `manage:Tournament`). Everyone gets it with the tournament (`winners`).
- **The data decides; an admin confirms** (`lib/awards.ts`, by the award's name): Champions, the champion team; Top
  scorer, most goals (a tie is joint winners); Best goalie, the goalie (position G) whose team let in fewest a game;
  the Dim Mak (a fun one), a player drawn at random, with Draw again. Only an award the data can't decide asks the
  admin to pick. Once it's done the page shows the data's picks as Provisional; Confirm the awards (the Awards
  section, or Manage, built for a phone) saves them.

## Consequences

- The website still takes results from Sanity (`kumiteResult`); taking champions and winners from the app's club
  snapshot is a later step.
- An award renamed after it was given keeps its winner under the old name until it's given again.
