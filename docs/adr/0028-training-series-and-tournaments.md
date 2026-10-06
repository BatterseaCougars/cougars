# 0028. Training repeats as a series; tournaments are typed and scheduled one by one

- **Status:** Accepted. Supersedes [0025](0025-events-in-d1.md) (its single `events` + `event_series` model). Keeps
  0025's decision that the schedule lives in D1 and the website reads public dates live.
- **Date:** 2026-10-06

## Context

[0025](0025-events-in-d1.md) put every date in one `events` table with a generic weekly series. Two things don't
fit that:

- **Training repeats.** Friday is a training session every week, and the club may add others (a Sunday skills
  session). Sign-ups, the register, teams and charges belong to one session, but most of what describes it (time,
  venue, places) is the same every week.
- **Tournaments don't repeat on a rule.** The Cougars Kumite happens a few times a year on dates chosen each time.
  Every edition shares a format and rules (round robin, points, game length, a captains' draft) but has its own
  name, location and date. The club may host other kinds.

Gwenda ops solves the first with series and nights: the series holds a rule and the defaults, each night is its
own row that inherits what it doesn't override, and a night is moved or dropped on its own.

## Decision

Three sources, one calendar. Tables in [team-app data model](../team-app-data-model.md).

- **`training_series` → `training_sessions`.** A series has a rule (every N weeks on chosen weekdays, from a first
  date to an optional last one) and the session defaults (start, end, venue, places). Sessions are rows, made ahead
  by a daily Cron Trigger (12 weeks for an ongoing series, as Gwenda publishes). A session's own columns are null
  unless it differs ("this week we're at the other rink"). Cancelling keeps the row, so whoever signed up can be
  told; moving keeps the rule's original date so it isn't made again. Changing the rule removes future sessions
  it no longer makes, unless someone has signed up or an admin changed them.
- **`tournament_types` → `tournaments`.** A type holds the format and rules; a tournament is one edition with a
  name, location, date and status (coming up, sign-up open, live, finished). Teams, fixtures, the draft and
  results belong to the edition.
- **`club_events`** for anything else: a social, a kit day.
- **The calendar** is the three together. Each series and type has an **icon and a colour**, chosen by an admin, so
  entries are told apart at a glance and can be filtered.
- **The app is built from this data.** Each active series gets its own page and menu link; each active tournament
  type gets a folding menu section (Games, Standings, and Draft if it uses one). Admins manage both under
  Settings → Schedule (`manage:Training`, `manage:Tournament`), and a new one appears straight away.
- Sign-ups (`attendance`, `tournament_entries`), teams and charges point at a session or a tournament, never a
  generic event.

## Consequences

- Friday's defaults change in one place; this week's differences stay on this week's row.
- Routes depend on data, so the route tree is built at runtime (`nav-routes.ts` `buildRoutes`), and paths carry
  slugs (`/training/friday`, `/tournaments/kumite`). Renaming keeps the slug.
- Three tables feed the calendar and the website's public dates, so reading them is one union query.
- A one-off tournament of a new kind needs a type first; that's one short form.
