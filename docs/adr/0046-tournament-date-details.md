# 0046. A tournament date has its own details: location, sign-up deadline, draft night, captains

- **Status:** Accepted; its locations are places since [0051](0051-venues-and-map-links.md). Builds on
  [0030](0030-training-series-and-tournaments.md) and [0042](0042-whats-on-from-the-club-calendar.md).
- **Date:** 2026-10-07

## Context

A tournament type (The Cougars Kumite) has dates. A date could only have its fee and status changed from the list,
nothing else, and its location had to be typed each time, though the Kumite is always at the sports centre. Running
one also needs a last day to sign up and, for a drafted type, a draft night and its captains.

## Decision

- A **type has a default location**. A date's own location overrides it; empty means the type's. The API sends both,
  `location` (the date's own) and `venue` (where it really is), and the website reads the same rule in SQL.
- Pressing a date in Settings → Tournaments opens it **in a sheet** with everything: name, date or _Date TBC_, times,
  location, places, fee (fixed once charged), status, _Show on the website_ and _Sign-up closes_. _+ Date_ opens the
  same sheet, empty. Status can still be changed from the list.
- **Sign-up closes** at the end of that day (London). After it, the server refuses "I'm in" (409); saying out is still
  fine, and an admin can still add someone. Empty: open up to the day.
- For a type whose captains draft the teams: **draft day and time**, and **captains in pick order** (up to 8, each
  once), stored in `tournament_captains`. The live draft room (roadmap T6) reads them.
- Migration `0016` adds the columns and table, sets the Kumite's default to Battersea Sports Centre, and clears that
  same location from its dates so they follow the default.

## Consequences

- Moving the Kumite means changing one field; every date without its own location follows, on the website too.
- The sign-up deadline and the captains are in place before the draft room exists, so they're set once, not twice.
- Nothing yet tells captains they've been picked, or reminds people before sign-up closes (notifications, later).
