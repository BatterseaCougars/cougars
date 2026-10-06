# 0034. Quarterly membership is a subscription of its own; the Cougars are a flag on the member

- **Status:** Accepted. Amends [0026](0026-dues-ledger.md) and [0032](0032-fees-per-session-and-tournament.md)
  (`member_plans` becomes `subscriptions`).
- **Date:** 2026-10-06

## Context

Two kinds of member matter beyond everyone else, and they're easy to confuse because both carry the club's name:

- **Cougars Quarterly Members** pay a special quarterly rate that covers every training session in the quarter.
  Everyone else pays per session they attend.
- **The Cougars** are the club's official team. When teams are made for a training, the Cougars play together
  on one team called "Cougars" (as the old app did, `archive/team-manager`).

[0026](0026-dues-ledger.md) put how someone pays in `member_plans`, a row per member with a `plan` of
`subscription` or `payg`. That reads like a property of the member, and makes "pay as you go" something that has
to be stored. A quarterly membership is really something a member takes out for a stretch of time, and may let
lapse.

## Decision

- **A quarterly membership is a subscription**, in its own table: `subscriptions` (member_id, starts_on,
  ends_on). A member with a subscription covering a date is a Quarterly Member on that date; anyone without one
  pays as they go. Nothing about it is stored on `members`. The rate is `subscription_fees`, as before.
- **A subscription covers every training session in the quarter**, charged once at its start (as in 0032).
  Tournaments are charged to everyone, subscribers included.
- **The Cougars are `members.cougar`**: whether someone is on the official team. Admins set it on the Members
  screen; the roster seed sets it when it first adds a player (`"cougar": true`), and never changes it after. The
  team generator puts every Cougar on one team first, then balances the rest by rating.
- The two are independent: a Cougar may or may not be a Quarterly Member, and the other way round.

## Consequences

- "Who's a Quarterly Member this quarter" is a date query on `subscriptions`; history (who subscribed when) comes
  for free, and lapsing needs no update to the member.
- Charging (T4) checks for a covering subscription instead of reading a plan, and pay-as-you-go needs no rows.
- In the app, "Cougar" always means the official team; quarterly membership is shown as "Quarterly" so the two
  don't blur.
- Still open (T4): calendar quarters or a club season, and what someone joining mid-quarter pays.
