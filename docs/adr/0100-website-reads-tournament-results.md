# 0100. The website reads tournament results from D1, live, and names players as they chose

- **Status:** Accepted
- **Date:** 2026-10-09

## Context

The team app records a tournament from start to finish: its teams, every game and goal, who scored and assisted, the
champions and the awards an admin confirms ([0061](0061-fixtures-games-and-scoring.md),
[0044](0044-champions-and-awards.md)). The website showed only its date (the agenda,
[0042](0042-website-reads-the-club-agenda.md)). Its champions board read Sanity `kumiteResult` documents, which
someone would type in by hand after each Kumite; neither Sanity project had any.

Two ways were open. The team app could write a `kumiteResult` to Sanity and trigger a rebuild (a Sanity write token on
the Worker, a GitHub token, a result in two places). Or the website could read D1, as What's on already does.

## Decision

- **D1 is the record; the website reads it live** on the Worker, through `lib/server/results.ts`, cached like every
  live read: fresh a minute, the last good copy kept an hour ([0053](0053-live-reads-are-cached.md)). Nothing is
  written to Sanity, and no rebuild is needed.
- **What's published:** a tournament that's public (`tournaments.public`) and done. Done is the app's rule, in
  `packages/shared/results.ts`: marked finished, or every game played. A tournament being played isn't shown here; that's the
  live page (#48).
- **One rule set.** The table, the champion and "done" live in `packages/shared/results.ts`, used by the Worker, the app and
  the website, so they can't disagree.
- **What a result shows** (`/results/<id>/`): the champions, the awards with their winners, the table, every game's
  score, and the scorers (goals and assists). Award winners show only once an admin has confirmed them; the app's
  provisional picks stay in the app. With no confirmed Champions, the champions are worked out from the games.
- **`/results/`** lists every published tournament, newest first. The champions board on the home page and
  `/kumite/` is a live fragment (`/honours/`) swapped in by script, like What's on; without JavaScript it's a link to
  `/results/`.
- **Names.** Every player is shown by the name they chose on their profile (`members.web_name`), else first name and
  initial (`publicName` in `packages/shared/names.ts`, as on the roster, [0043](0043-roster-and-names.md)). That includes
  members who aren't Cougars. A player from outside the club, who has no profile, is shown as first name and initial
  too. A team with no name of its own is "Team" and its captain's chosen name, else their first name. A full name
  never leaves the query.
- **Crests** are small data URLs in D1. They're served from `/api/crests/<team id>`, cached, only for a published
  tournament's teams, so pages stay small.
- **Player stats** on `/team/` and the back of a card add goals, assists and titles, from published tournaments only,
  in the build's roster snapshot (`scripts/lib/roster-sql.mjs`, #65). Goals and assists count from played games, as
  on a result. A title is a tournament whose Champions an admin confirmed, on that team as captain or player.
- Sanity's `kumiteResult` type, its query and the Studio schema are gone.

## Consequences

- The champions are on the website within a minute of the last game, and the awards within a minute of an admin
  confirming them. Nobody re-types a result.
- No Sanity write token or GitHub token for results: #49 is closed, and #53 is about club facts and roster cards only.
- A result corrected in the app corrects the website too. Making a tournament private takes it off the website.
- One more live D1 read for the home page (the board) and two live pages, within D1's free reads.
- A past Kumite played before the app has no record on the website. If the club wants one, it goes in the app as a
  tournament.
- Player stats change at the next build (daily in production), like the rest of the roster; the results themselves
  are live.
- The privacy notice says that results and stats show each player's chosen name.

## History

- 2026-10-09: Results are read from D1 live instead of written to Sanity; `kumiteResult` retired.
