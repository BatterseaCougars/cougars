# 0009. Site design: a Friday night, on carbon, one-page navigation

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

The club is a tough, funny, friendly crowd: South London roller hockey meets a JCVD film, est. 1996, the pub
afterwards. Earlier designs were rejected as copied, gaudy, too busy, too sophisticated, or generic.

## Decision

- **Look:** dark carbon-fibre background, bone-white woodtype headings (Anton), logo red. Cream is an accent
  only (trading cards, the beer mat, the newsprint back page). The Kumite section goes "underground": darker,
  with an 80s fight-film poster.
- **Structure:** the home page runs as a Friday night: 19:00 who we are, 19:30 Fridays, 21:30 the team,
  21:45 the pub, then the Kumite, events, footage and news. A header clock follows the sections.
- **Navigation:** for now every nav item scrolls to its section of the home page, from any page. Full pages
  are reached from each section's "see all" link.
- **Voice:** irreverent but welcoming. Ethos line: "Hooking, slashing or refusing to pass may result in being
  drafted first." Jokes never state club facts that aren't true.

## Consequences

Colours are semantic tokens (`--paper`, `--text`, ...) with `.night` and `.newsprint` scopes, so sections
can change palette. New sections need a `data-time` / `data-title` for the clock.
