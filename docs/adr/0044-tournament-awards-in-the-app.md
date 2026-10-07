# 0044. Tournament awards are set in the team app

- **Status:** Accepted. Replaces the Studio's Kumite _Awards_ list as the source (it stays as the fallback).
- **Date:** 2026-10-07

## Context

The Kumite's awards were a list of names in Sanity. The club wants to set them where it runs tournaments, the team
app, and to add fun ones with a line on what they're for (the fastest goal from a faceoff). Each tournament type may
hand out different awards.

## Decision

- `tournament_types.awards` (migration `0015`) holds a type's awards as JSON: `{ name, about }`, up to 8, edited in
  the tournament editor (Settings → Tournaments). The Kumite starts with Champions, Top scorer, Best goalie and
  The Dim Mak (fastest goal from a faceoff; one touch, lights out).
- The website takes the Kumite's awards from the build's club snapshot (`scripts/club-snapshot.mjs`, which also
  takes the roster, [ADR 0043](0043-roster-from-the-club.md)): names on the home page, names and lines on `/kumite/`.
  Until the snapshot has them, Sanity's names.

## Consequences

- A change to the awards reaches the website at the next build (daily in production), like the roster.
- Who won each award isn't recorded yet; results stay in Sanity (`kumiteResult`) until the app records them.
