# 0049. A tournament owns its rules; its series is optional

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Every tournament had to belong to a type (The Cougars Kumite), and read its points, game length, draft and awards
from it, so one edition couldn't play differently. An admin also wants to run a one-off tournament that isn't part
of anything. And editing a tournament mixed two jobs: the once-a-year defaults and the date at hand.

## Decision

- Settings → Tournaments is the schedule: a card per tournament. Settings → Tournament Series holds the series
  (the old types) and their defaults.
- A tournament's series is optional (`tournaments.type_id` may be null). One on its own shows on the calendar as a
  trophy in the club's red, with no menu section, Games, Standings or Draft pages of its own.
- A tournament keeps its own copy of the rules (points for a win, draw and loss, game length, captains draft) and
  awards: `tournaments.points_win` … `awards`. Picking a series copies its defaults in, with its location and fee;
  the API takes the series' for any left out. They can then change for that tournament alone.
- The series' look (icon, colour), name and menu section stay the series': they aren't per tournament.
- Standings, Games and the game clock read the tournament's own rules.

## Consequences

- Changing a series' defaults changes new tournaments, not ones already scheduled.
- The website's Kumite page still lists the series' awards (ADR 0044); a tournament's own awards aren't on it yet.
- A tournament on its own has no Games, Standings or Draft pages until those exist outside a series.
