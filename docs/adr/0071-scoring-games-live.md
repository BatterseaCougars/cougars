# 0071. Scoring a game as it's played: one person holds the scoresheet

- **Status:** Accepted. Amends [0061](0061-fixtures-and-playoffs.md) (results were only entered after a game).
- **Date:** 2026-10-08

## Context

On the day, someone has to run the clock and keep the score, and everyone else wants to see it. A result typed in by
an admin afterwards wasn't enough, and nobody wanted two phones scoring the same game.

## Decision

- **A team sitting the game out is suggested to keep score** (`scorekeepers` in `lib/fixtures.ts`): in the day's
  order, each game goes to a team not playing in it, turns spread evenly. It's a suggestion, shown on the Fight card,
  the tournament's home and the game's page.
- **One person keeps score.** Whoever presses **Start scoring** holds the game's scoresheet (`keeper_member_id`); only
  they can run its clock and log its goals. Anyone can take it on while nobody has (someone steps in when the team
  can't). It's let go by whoever holds it, or an admin. It's only taken on for the game up next (or on now).
- **The scoresheet:** start and pause the clock (stored as time left and when it last started, so it survives a
  reload or a locked phone), log each goal (team, then scorer and assist, both optional, both on that team, with the
  game time), take back the last goal, and call **Full time**, which makes the score the result and fills the
  playoffs as before. One game on at a time.
- **Everyone sees it as it happens:** the score is on the game as it changes; the tournament's home and the game's
  page check for changes every 10 and 5 seconds while a game's on, and the clock ticks on each phone.
- A game being played has a score but no result: the table counts only finished games.
- **Only the game on now is scored.** Scoring, the clock and a typed-in result go on the first game in the day's
  order that isn't over; the next opens at full time. A played game's result can still be put right (0061).
- **Start and pause is one big button right under the clock**, with clear space before Goal: easy to hit, hard to
  hit by mistake. The clock itself isn't a button. Who scored and who assisted open in a side drawer (full width on
  a phone).
- **The scoresheet is simple; the rest is behind a gear.** Whoever's scoring is on a phone, out of breath: the page is
  the clock, one big button (Start, Pause; Full time once time's up, tapped twice), Goal for each side and the goals.
  Set the time, take back the last goal, full time early and stop scoring are in Game tools, behind the gear in the
  "You're keeping score" banner.
- **The scorekeeper sets the time** (in Game tools): minutes and seconds left, or nudged by 10
  seconds or a minute, by their watch or the ref's. Paused, it stays paused; running, it runs on from the time set.
  Only once the game's started, and never more than an hour.
- **Every game has its own page**, from the Fight card (Details; Full result once played) and the tournament's home:
  the clock and score, the goals in game time, and both teams' rosters (captain marked, who scored). It's where the
  game is scored. Its back link returns to the page it was opened from.
- **An admin puts a result right on that page** (Edit the result): add a goal (who scored, who assisted, when, or
  "don't know when"), take any one off, or just set the score (goals go on or come off to match). For the game up
  next, Enter the result instead records it played 0–0 and opens Set the score. **The score is always its goals**: a
  score typed in becomes that many nobody-said-who goals with no time, so the two never disagree. The scorekeeper is
  done with a game at full time.
- **Few requests:** the clock never ticks on the server or in storage. It's time left plus when it last started, so
  each phone counts down by itself; only start, pause, goals and full time are sent. Everyone on the page, the
  scorekeeper too (the same person may have it open twice), checks for changes as often as the admins set (every 10
  seconds to start, ADR 0072) while the page is in view. Holding ticks in a cookie was turned down: a cookie rides on
  every request, and the server would then lag the pitch.

## Consequences

- `tournament_goals` (scorer and assist per goal) opens up top scorers and assists later.
- Polling, not push: a few seconds' lag, inside the free Worker allowance (ADR 0058).
