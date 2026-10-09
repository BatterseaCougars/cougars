# 0102. Friday teams are balanced by a greedy deal and a swap search in the browser, not a linear programme

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

The old team manager balanced Friday teams with a two-phase integer linear programme (PuLP and the CBC solver,
`archive/team-manager/lib/solver_lp.py`, documented in `lib/SOLVER.md` beside it) on a paid server. Its rules: 3 to 7
a side, the fewest teams that allows; the Cougar players together on one team called Cougars; a defender and a
forward on every team where there are enough; then sizes within one, defenders spread evenly, and ratings balanced
by rank, in that order, as weights of 1000, 500 and 1. It had an 8 and 12 second time limit per phase and fell
back to a snake draft when it ran out, or for 30 players and over.

The plan ([0006](0006-one-repo-two-projects.md), #37) was to port that model to glpk.js (GLPK compiled to
WebAssembly, about 3 MB) in a Web Worker, so it could run on the organiser's phone for nothing. Meanwhile
`lib/snake.ts` was a greedy stand-in.

A Friday has 6 to 30 players and 2 to 5 teams. Ratings are whole numbers from 0 to 100 that an admin guesses. The
difference between the best possible split and a very good one is smaller than the error in any one rating.

## Decision

- **No linear programme.** `apps/team/src/lib/balance.ts` makes the teams: a greedy deal to start (the Cougars onto
  their team, best first, up to a full team; then keepers, defenders and forwards, best first, each to the team with
  room that has fewest of their position, then fewest players, then the lowest rating), then every single move and
  every swap of two players is tried and the best taken, until none makes the teams more balanced. A dozen more runs
  from random deals, and the most balanced wins. The same players always give the same teams.
- **What "more balanced" means is a list, compared in order**, not weights: sizes within one; as many Cougars on
  the Cougars as fit; keepers spread evenly; defenders spread evenly; the strongest team's average rating minus the
  weakest's; the same per position added up, so one team doesn't get all the best defenders. The first thing that
  differs decides. Keepers (`members.position = 'G'`) are in, which the old solver dropped.
- **Average rating, not total**, is what's balanced. With 6 against 7 the team of 7 already has the extra rest, so
  it doesn't also get the weaker players.
- **Even sizes come before keeping the Cougars together.** The Cougars fill their team but never overfill it;
  with more Cougars than a team holds, the best of them stay and the rest are dealt out. The old solver would have
  made a 7 against two 4s to keep them together.
- **It runs on the main thread**, no Web Worker: 30 players take about 40 ms in Node, under the card shuffle that
  plays while the teams are made ([0076](0076-training-teams.md)).
- Late sign-ups still go by rule onto teams already made, `slotIn` in the same file, without remaking.
- It's unit tested ([0031](0031-use-case-tests.md)): rosters of 6, 14, 15, 21, 22 and 30; too many Cougars; too few
  defenders; keepers; the old app's full-session fixture; and a 12-player roster checked against every one of its
  4096 splits, which the search matches.

## Consequences

- No 3 MB dependency, no Worker, no time limits, no fallback path: one 200-line file that reads as the rules.
- The search is not guaranteed optimal for every roster. On 360 random rosters the restarts left 4 a little short of
  the best of 30 runs, each by under a point of average rating, which the ratings can't tell apart anyway. The
  brute-force test is the check that it isn't missing by much.
- `.github/kb/js-solver-port.md` stays as reference for the LP model and is not the plan.

## History

- 2026-10-05: The team generator is to run in the browser on a glpk.js port of the Python LP (0006).
- 2026-10-09: A greedy deal and a swap search instead; the port is dropped (#37).
