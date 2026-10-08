# 0065. Admin actions live where the thing is, not under Settings

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

An admin's jobs were reached through Settings: to add a Kumite date or its captains you went to Settings →
Tournaments, found the card and opened its editor, then went back to the tournament to run the draft. That's how the
data is organised, not how an admin works. They are on the tournament's page when they think "next date" or "who
captains", and the trip through Settings made the app feel harder than it is.

## Decision

- **An admin acts on a thing from the thing's own page.** Its page carries the actions the admin's role allows
  (New date, Edit, Add the captains, Add player, Reset), and they open over the page: a sheet, drawer or editor
  panel, never a navigation to Settings.
- **Settings is for setting up, not for running.** It keeps the full list (every tournament, every series) and
  configuration nothing else owns (roles, fees, venues), and its editors are the same components the pages open, so
  there's one editor per thing.
- Members see the same pages without the admin actions; nothing about the page changes shape for them.
- New features are designed from the page out: where is the admin when they need this? Put it there first.

## Consequences

- The tournament pages (Games, Standings, Draft) open the tournament editor in place (`TournamentEditorPanel`), on the
  tab the action needs; Settings → Tournaments uses the same panel.
- Other admin flows still buried in Settings (training dates, fees, the register) should move the same way as they're
  touched.
