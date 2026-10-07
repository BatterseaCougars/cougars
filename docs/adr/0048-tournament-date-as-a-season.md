# 0048. A tournament date can be just a season

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

A tournament is often planned months ahead ("the Kumite, next summer") before anyone knows the day. "Date TBC"
([ADR 0046](0046-tournament-date-details.md), migration 0009) still asks for a day, so an admin made one up, and that
day decided where it sorted. TBC stays useful on its own: a day can be set and still not be confirmed.

## Decision

We will let a tournament date be a season and a year instead of a day: spring, summer, autumn or winter (the UK's,
by month; winter is December to February). It's stored in `tournaments.season`; `held_on` stays required and holds
the season's last day, which is never shown. It decides where the date sorts and keeps it "coming up" until the
season is over. A season counts as unconfirmed. Wherever "Date TBC" was shown, the app and the website show
"Summer 2027". The rules live in `shared/seasons.ts`, used by the app, its API and the website.

## Consequences

- No made-up days; the calendar sorts a season after the dates inside it, which reads right.
- Anything that filters on `held_on` (coming up, past, the roster's tournaments played) keeps working unchanged.
- Code that shows a tournament's date has to check `season` first. There are three places today: the app's
  `whenOf`, its event card, and the website's What's on.
