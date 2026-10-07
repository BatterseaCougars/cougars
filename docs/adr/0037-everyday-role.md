# 0037. People with more than Member can run the app day to day as a lesser role

- **Status:** Accepted
- **Date:** 2026-10-07
- **Builds on:** [0024](0024-action-based-authorization.md), [0029](0029-view-as-a-member.md)

## Context

Admins use the app on their own phone at the rink and show it to members: who's in, the teams, the calendar. In
their full role the app also shows ratings, admin pages and admin buttons, which members shouldn't see over their
shoulder. View as a member ([0029](0029-view-as-a-member.md)) is the wrong tool: it shows someone else's data,
read-only, and takes several taps to start and stop.

## Decision

- A member whose role is more than Member can choose an **everyday role** on their Profile, for example Contributor.
  It's stored on the member (`members.everyday_role_id`), so it applies on every device. The choices are roles that
  can do less than they can; the API refuses anything else, so it can never be a way up.
- The app **opens in the everyday role**: the pages, buttons and data it shows are that role's and Member's.
- A **switch beside the account badge**, labelled with their full role ("Admin"), moves them up. It's lit while
  they're in their full role and moves them back when tapped again; the account menu has the same switch. Going back
  from a page the everyday role can't see goes Home.
- Being switched up lasts for the tab (session storage): the app always reopens in the everyday role.
- View as a member isn't offered in the everyday role; switch up first.

## Consequences

- An admin can hand their phone round without hiding anything by hand.
- **It's a screen safeguard, not a security boundary.** The server still authorizes by the member's real roles and
  still sends the data those roles may see ([0036](0036-api-security.md)); the app simply doesn't show it. Someone
  with the phone and devtools could still read it, as they could before.
- Every place that decides what to show must use the app's granted actions (`granted()`), never the real roles,
  and role badges for yourself use `shownRoles()`.
