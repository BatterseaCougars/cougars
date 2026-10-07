# 0061. The app makes a tournament's fixtures: a round robin, then its playoffs

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Games and Standings ran on sample data. Nothing stored fixtures or results, so a real tournament had a table of fake
teams.

## Decision

- Once a tournament's teams are set (its draft closed, or the teams that entered), an admin has the app **make the
  fixtures**: a round robin by the circle method (every team plays every other once, in rounds), then the playoff
  games its settings ask for.
- **Playoffs** are a setting copied from the series like the rules (ADR 0049): a list of games by table position, each
  with a name, e.g. Final (1 v 2), or Final and 3rd place (1 v 2, 3 v 4). None is fine.
- `tournament_games` holds each game: stage (group / playoff), round, order, teams, the playoff's seeds, and the final
  score. When the last group game has its result, the playoffs get their teams from the table (points, goal
  difference, goals for).
- Fixtures can be made again until a game has a result; then they're set.
- `lib/fixtures.ts` (round robin, table) is shared by the Worker and the app.

## Consequences

- Games and Standings show the real tournament. Goal by goal, scorers and the game clock are still live scoring (T5).
