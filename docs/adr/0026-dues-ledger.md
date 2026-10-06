# 0026. Dues are a ledger fed by the register

- **Status:** Accepted. Amends [0007](0007-bank-transfer-payments.md) (no monthly invoices). Amended by
  [0032](0032-fees-per-session-and-tournament.md) (fees per session and tournament, payments per charge).
- **Date:** 2026-10-06

## Context

Members pay either a quarterly session subscription or a fee per session. Both fees are set by admins and change
over time. The hard part is attendance: teams are built from app sign-ups, but people still turn up without
signing up. The club needs to know who owes what, and for how long (an aged-receivables report).

[0007](0007-bank-transfer-payments.md) planned monthly invoices with a reference each, drafted, reviewed and sent.
That is more process than a volunteer-run club needs.

## Decision

- **Fees** are a dated schedule (`fees`: kind, amount, effective_from), set in the app. A charge keeps the amount
  it was made with.
- **Who pays how** is in `member_plans` (subscription or pay as you go, from, to).
- **Attendance comes from the register**, not sign-ups: on the night, one screen lists who signed up, marks
  no-shows and adds walk-ins. Closing the register makes it final.
- **Charges**: closing a register charges every pay-as-you-go attendee; a quarterly Cron Trigger charges
  subscribers.
- **Payments** are bank transfers ([0007](0007-bank-transfer-payments.md)) quoting the member's own fixed reference.
  An admin records them; each payment settles the oldest unpaid charges first (`payment_allocations`).
- Members see their own tab. Admins see **Overdue Rentals**, the aged-receivables report: what each member owes,
  split into Due back (0–30 days), Late (31–60), Very late (61–90) and Lost tape (over 90).

## Consequences

- No invoices to draft or send; the report and the member's tab read straight from charges and payments.
- Dues are only as good as the register; it has to be quick enough that someone does it every Friday.
- A reopened register (to fix a mistake) changes charges; corrections are audited.
- Open: calendar quarters or a club season, mid-quarter joiners, concessions, a free first session.
