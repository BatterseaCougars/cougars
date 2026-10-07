# 0051. Venues are saved and picked; a one-off pastes its map link

- **Status:** Accepted. Builds on [0046](0046-tournament-date-details.md), whose locations become places.
- **Date:** 2026-10-07

## Context

Trainings, tournaments and events stored only a place's name as text. Their map link was a Google Maps search for that
name, so a vague name found the wrong place, and nothing held an address. The same place (the sports centre) was typed
on every training and tournament series, so a change meant finding each one. A social at a pub the club goes to once
shouldn't need a saved place just to have a map.

## Decision

- A **`venues` table**: name, address, `map_url` (pasted from Google Maps, Share → Copy link) and `active`. Settings →
  Venues (`manage:Venue`) adds and edits them. One no longer used is hidden from the pickers, never deleted, so what has
  it keeps it.
- Everything with a place (training series and sessions, tournament series and tournaments, one-off events) has
  **`venue_id`**, plus its existing name column (`venue`, or `location` on tournaments) and a **`map_url`** of its own.
- **One rule**, `placeOf` in `shared/places.ts`, used by the team app and the website: the saved venue wins; else the
  name and link it has; else its series' place (a session's training, a tournament's series). A place with no link
  gets a map search for its name and address. Picking a venue clears the thing's own name and link.
- In the app, every editor's _Where_ is one picker: the saved venues, then _Somewhere else…_, which asks for a name and
  a map link. A tournament can also leave it on _Usual_, its series' place.
- A pasted link must be an `http(s)` web link (the server refuses anything else), so a link can never run script.
- The calendar file the app hands out has the venue's name and address as its location.

## Consequences

- Moving the sports centre's link or address is one edit; every training, Kumite and event there follows, on the
  website too.
- The API no longer sends a tournament's worked-out `venue`; the app works it out with the same rule as the website.
- An existing place typed as text keeps working (name and search link) until it's re-picked as a venue. The seed links
  Friday Training and the Kumite to the sports centre for a fresh database; local and dev were linked by hand.
- The website's own Fridays venue (Sanity settings) is separate content and isn't linked to this table.
