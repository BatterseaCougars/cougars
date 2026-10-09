# 0087. The next tournament is scheduled in three questions

- **Status:** Accepted. Amends [0065](0065-admin-actions-where-the-thing-is.md) (a button on the page, not only
  in the Manage menu, when nothing's scheduled) and [0074](0074-tournament-home-in-three-acts.md).
- **Date:** 2026-10-09

## Context

The story: an admin opens the Kumite page and sees the last one. They schedule the next: its day, its captains, its
draft's day. The page then shows the new one, its day obvious, the draft's day obvious or TBC, the captains
optional.

Before, "New Kumite date" was the last item in the Manage menu. It opened the full editor on four tabs. The day was
on Details next to series, name, type, season and year; the draft's day and the captains were on the fourth tab.
Creating it opened the new one's editor rather than going back to the page.

## Decision

- **When nothing's coming up** (the last one's been played, or there's never been one), an admin sees **Next
  Kumite** as the main button beside Manage on the series page.
- **A new date in a series opens on three numbered questions** (TournamentQuickCreate): when is it (a day,
  "not fixed yet" for TBC); when's the draft (optional, a draft series only); who are the captains (optional, in
  pick order). **Schedule it** creates it and closes the panel on the page, which now shows the new one.
- **The rest comes from the series:** its name, fee, place, rules, awards and playoffs; 11:00–16:00; sign-up not
  open. The server fills in what's left out of a new one (hours, status, the series' fee), as it already did the
  rules, so the quick form sends only what it asked.
- **The Manage menu is what has no page of its own**: the settings (day, sign-up, captains and draft day, rules,
  awards) and Confirm the awards. The draft is run on its own tab (Open the draft is there) and the fight card on its
  own (Make the fixtures is there, and the draft offers it when it closes), so neither is in the menu. There's no
  separate "Captains and draft date" (it's in the settings) and no "New date" (the page's Next button does that once
  nothing's coming up).
- **Advanced** opens the full editor with the answers filled in, for the hours, place, fee, sign-up and rules.
  **Back to the questions** returns to them, keeping what was changed there.
- **The draft has a day, not a time.** It's a reminder for the captains (on their calendar as a day); an admin
  messages them when it opens. `draft_time` is gone from the schema, the forms and every display.
- **The draft card leads with the draft's day or "Draft date TBC"**, with or without captains; with none, it says
  "Captains to be named."

## Consequences

- Scheduling the next one is one button and up to three answers; nothing else is needed.
- A one-off tournament (no series) and Settings → Tournaments still use the full editor.
