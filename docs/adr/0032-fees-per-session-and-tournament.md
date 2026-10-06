# 0032. Fees belong to each session and tournament; payments are marked against what they paid for

- **Status:** Accepted. Amends [0026](0026-dues-ledger.md).
- **Date:** 2026-10-06

## Context

[0026](0026-dues-ledger.md) kept one club-wide per-session fee and settled payments against the oldest charges
first. In practice an admin needs to say "Jo paid for last Friday and the Kumite", to see how much each session
actually brought in, and to charge a tournament differently from a training. Trainings change price from a date;
each tournament edition can cost something different from the last.

## Decision

- **Trainings have a fee that applies going forward.** Each training has a dated fee schedule
  (`series_fees`: amount, effective_from). A session's fee is the one in force on its date, and it is written onto
  the session (`training_sessions.fee_pence`) when its register closes, so a later change never alters it. An
  admin can override one session's fee.
- **Tournament types have a default fee; each edition has its own.** Scheduling an edition copies the type's
  default (`tournament_types.default_fee_pence` → `tournaments.fee_pence`), and the admin can change it there.
- **A charge is one person for one session or tournament** at that fee (`charges`: member, session or
  tournament, amount, due_on). Closing a register charges every pay-as-you-go attendee, walk-ins included;
  subscribers aren't charged for training sessions. Tournament entrants are all charged.
- **Payments are marked against charges.** On a member's profile an admin ticks what they paid for (bank transfer
  or cash), and can untick a mistake; each tick is a payment allocated to that charge. A bank-statement upload
  (later) creates payments by reference and allocates them oldest first, which the admin can then re-point.
- **What a session collected** is the sum of its paid charges, shown beside what it was due.
- **Overdue Rentals is just the unpaid charges**, summed per member and bucketed by the age of each charge: Due back
  (0–30 days), Late (31–60), Very late (61–90), Lost tape (over 90). A member's tab is the same charges, theirs only.

## Consequences

- Every pound owed or paid points at a session or tournament: the club can see who paid for what, and what each
  night brought in.
- The single "per session" fee on Settings → Fees goes; that page keeps the quarterly subscription.
- Marking payments one charge at a time is more taps for someone who pays for a month at once; "Mark all paid" on
  the profile covers it.
- Partial payments (paying £5 of £10) are possible through allocations but have no screen yet.
