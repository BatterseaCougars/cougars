# 0052. A tournament is either teams entering or captains drafting, and every tournament has teams

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

A tournament had a "captains draft the teams" switch and a list of captains, and nothing else about its teams. But
the club runs two different things: a normal tournament, where teams sign up (some from outside the club, with a
captain we may only know by name), and the Kumite, where members sign up, captains are assigned and draft them.
Either way the club wants to know the teams: their names, logos, captains and players.

## Decision

- A tournament (and a series, as the default it copies) has a `kind`: `teams` (teams enter) or `draft` (captains
  draft members). It replaces the draft switch.
- Every tournament has teams (`tournament_teams`): a name, a logo, and a captain who is a member, or for a team from
  outside the club a name and how to reach them. Their players (`tournament_team_players`) are members, or
  players from outside the club by name, in order. `tournament_captains` is gone.
- In a draft, each team's captain must be a member, and the teams are in pick order (`pick`); their players come in
  the order they were picked. A team that entered must have a name.
- Nobody plays for two teams in one tournament. At most 16 teams of 30 players.
- A logo is shrunk in the browser (256px on its longest side, WebP) and stored in D1 as a `data:` URL, up to about
  150 KB. No image storage service is needed.
- The tournament editor has a Teams tab ("Draft & teams" for a draft, with the draft night). The series editor sets
  the type its tournaments start with.

## Consequences

- The Draft page is still the demo: running a real draft (captains picking from who signed up) and saving the picks
  is to come. Until then an admin can fill in a draft's players by hand.
- Logos in D1 make each tournament's row data heavier; fine at 16 teams, and they can move to storage later.
- Saving a tournament replaces its teams, so a team's id changes on each save; nothing refers to it yet.
