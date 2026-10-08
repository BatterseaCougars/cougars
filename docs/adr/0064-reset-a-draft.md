# 0064. An admin can reset a draft, until a game has a result

- **Status:** Accepted. Amends [0060](0060-draft-lifecycle.md): a closed draft is locked except for a reset.
- **Date:** 2026-10-07

## Context

0060 made a closed draft final, and Undo only takes back one pick while it's open. A draft that goes wrong (opened by
mistake, picks made in testing, the wrong captains) had no way back short of editing the database.

## Decision

- Whoever runs the draft (`run:Draft`) can **reset** it, open or closed: every pick comes off, any fixtures go
  (ADR 0061), and `draft_state` goes back to none, which reads as scheduled while it has a day and captains.
- **Sign-ups and captains stay.** Admin-added players (they're sign-ups) stay too.
- **Refused once a game has a result** (a score, or a game started): the day has begun and the teams stand.
- The app asks before it resets, since it can't be undone.

## Consequences

- A test draft can be run on the real tournament and thrown away.
- Captains' phones see the picks vanish within the 10-second poll; nothing tells them why.
