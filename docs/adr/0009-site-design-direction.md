# 0009. Site design: a Friday night, on carbon, one-page navigation, no news

- **Status:** Accepted
- **Date:** 2026-10-05 · updated 2026-10-09
- **Merges:** 0011

## Context

The club is a tough, funny, friendly crowd: South London roller hockey meets a JCVD film, est. 1996, the pub
afterwards. Earlier designs were rejected as copied, gaudy, too busy, too sophisticated, or generic.

The site once had a News section (Studio type `post`, `/news/` pages, a "back page" on the home page). Nobody at the
club will write posts regularly, and a news page whose last post is a year old makes the club look dead.

## Decision

- **Look:** dark carbon-fibre background, bone-white woodtype headings (Anton), logo red. Cream is an accent only
  (trading cards, the beer mat, the newsprint back page). The Kumite section goes "underground": darker, with an 80s
  fight-film poster.
- **Structure:** the home page runs as a Friday night: 19:00 who we are, 19:30 Fridays, 21:30 the team, then the
  Kumite, events, videos (mostly Friday sessions) and a photo gallery. A header clock follows the sections.
- **No news.** There is no Studio type, page or home section for it. Things that would have been news go where they
  belong: dates as **Events**, footage as **Videos**, pictures as **Photos**, and standing information in
  **Club details**.
- **Navigation:** for now every nav item scrolls to its section of the home page, from any page. Full pages are
  reached from each section's "see all" link.
- **Voice:** irreverent but welcoming. Ethos line: "Hooking, slashing or refusing to pass may result in being drafted
  first." Jokes never state club facts that aren't true.

## Consequences

- Colours are semantic tokens (`--paper`, `--text`, ...) with `.night` and `.newsprint` scopes, so sections can change
  palette. New sections need a `data-time` / `data-title` for the clock.
- Nothing on the site goes stale on its own: every section is driven by dated content (events, videos, photos) or by
  details that rarely change.
- If the club later finds someone to write, news comes back with a new ADR.

## History

- 2026-10-05: The Friday-night home page on carbon, one-page navigation and the club's voice (was 0009).
- 2026-10-05: News removed (Studio type, `/news/` pages, home section); its content goes to events, videos, photos
  and club details (was 0011).
