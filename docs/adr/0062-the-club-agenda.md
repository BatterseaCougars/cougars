# 0062. One agenda that every part of the club pushes to

- **Status:** Accepted. Builds on [0042](0042-whats-on-from-the-club-calendar.md) and
  [0045](0045-events-page-reads-the-club-calendar.md).
- **Date:** 2026-10-07

## Context

What's on and when was worked out twice, with different rules: the website's What's on (its own SQL) and the team
app's calendar and Home (in the browser). They disagreed on what's public, finished tournaments, paused trainings and
cut-off times, and neither showed a tournament's draft night or sign-up deadline.

## Decision

- An `agenda` table: one row per thing on a day (a training session, a tournament's day, its draft night, its sign-up
  deadline, a one-off event), with its time, place, TBC or season, public, cancelled, and who it's for.
- **Every change pushes its own rows** (`shared/agenda.ts`): a training's sessions when the series or a session
  changes, a tournament's when it or its series changes or its draft opens or closes, an event's when it changes; all
  of them when a venue changes. The rules (own place else the series', seasons, finished tournaments off) live there,
  once. An empty agenda (a rebuilt database) fills itself on the first read.
- The website's What's on reads its public rows for everyone. The app's bootstrap gets an `agenda` part from today:
  a draft night only for that tournament's captains and those running the draft. A change to anything on the calendar
  replies with the agenda too.

## Consequences

- The website and the app can't disagree about what's on.
- A new kind of dated thing is a new `kind` and one sync function.
- A write path that forgets to push leaves the agenda stale: each one is covered by a use-case test.
