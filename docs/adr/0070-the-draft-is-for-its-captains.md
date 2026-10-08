# 0070. The draft is for its captains: members see the teams once it's closed, in no particular order

- **Status:** Accepted. Amends [0060](0060-draft-lifecycle.md) (who sees the picks).
- **Date:** 2026-10-08

## Context

Who was picked first, and who last, is the stuff of a week's arguments. Every member's app had the whole draft in
its data: each team's players in pick order, with their pick numbers, live as the captains picked.

## Decision

- **The server decides who sees what** (the `tournaments` slice, `draftSeenBy` in `worker/api.ts`). A draft's
  captains, whoever runs it (`run:Draft`) and admins who edit teams (`manage:Tournament`) see everything, live.
- **Anyone else, while it's on** (scheduled or open): the captains, and no players on any team.
- **Once it's closed:** the teams, with no pick numbers, each team's players in an order that says nothing (a hash
  of team and player, so it's the same each time they look, and nothing moves on a refresh).
- **Home tells members the draft is on** (news, nothing to open) and, once it's closed, that the teams are out, with
  a link to the tournament's **Teams** page, which is now everyone's (`read:Event`). Editing there stays with admins.
  Captains and whoever runs the draft keep their Home link to the Draft page.

## Consequences

- A member picked during the draft doesn't see their team until it closes, even though they're on it.
- Reopening a closed draft hides the teams from members again until it closes.
