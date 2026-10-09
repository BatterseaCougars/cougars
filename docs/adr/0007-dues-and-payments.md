# 0007. Dues are charges per session and tournament, paid by bank transfer with a name reference

- **Status:** Accepted
- **Date:** 2026-10-05 · updated 2026-10-09
- **Merges:** 0026, 0032, 0034, 0038

## Context

Members pay either a quarterly rate that covers every training, or a fee for each session they attend. Tournaments
are paid for on their own, and each edition can cost something different from the last. Fees are set by admins and
change over time. Card providers charge per transaction, which conflicts with [0003](0003-free-tiers-only.md).

The club needs to know who owes what and for how long (an aged-receivables report), who paid for what ("Jo paid for
last Friday and the Kumite"), and what each night brought in. The hard part is attendance: teams are built from app
sign-ups, but people still turn up without signing up. Monthly invoices, drafted, reviewed and sent, are more process
than a volunteer-run club needs.

Two kinds of member are easy to confuse because both carry the club's name: **Cougars Quarterly Members** pay the
quarterly rate; **the Cougars** are the club's official team, who play together on one team called "Cougars" when
training teams are made (as the old app did, `archive/team-manager`).

Most of this is decided but **not built yet** (#46). What exists today: the
`subscriptions` table, `members.cougar`, `members.payment_reference` and its rules, `tournament_types.default_fee_pence`
and `tournaments.fee_pence`, and the register (`training_sessions.register_closed_at`, `attendance.attended` and
`walk_in`). The dues screens (a member's tab, Unpaid fees, charges on the member sheet) run on demo data only
(`apps/team/src/demo/dues.svelte.ts`, with the sums in `apps/team/src/lib/dues.ts`). `series_fees`, `subscription_fees`,
`charges`, `payments`, `payment_allocations` and `training_sessions.fee_pence` are planned in
docs/team-app-data-model.md but aren't in `db/schema.sql`, and nothing charges anyone yet.

## Decision

**Payment**

- Members pay by **bank transfer** (or cash, marked by hand). No card provider.
- Each member quotes **their own fixed reference**: `COUGARS`, their first name and their surname's initial,
  `COUGARS ADRIAN K`. UK bank references hold 18 characters, letters, digits and spaces, shown in capitals:
  - accents are dropped and letters a bank won't take are spelled out (Ł → L, ß → SS); anything else goes;
  - the first name is cut to leave room for a clash digit, so it always fits;
  - a second person with the same first name and initial gets the next digit, `COUGARS SAM T2`, up to 9; past that,
    `COUGARS` and their id.
- The reference is set once, when the member is made (a join request, an admin adding them, or the roster seed), and
  never changed after, not even when their name is edited: it's what their standing order quotes. Someone without one
  gets it the next time they sign in. `packages/shared/payment-reference.ts` holds the rules and the SQL, used by both the
  Worker (`giveReference` in apps/team/worker/auth.ts) and the roster seed (scripts/lib/roster.mjs).

**Fees** (not built)

- **Trainings have a fee that applies going forward**: a dated schedule per training (`series_fees`: amount,
  effective_from). A session's fee is the one in force on its date, written onto the session
  (`training_sessions.fee_pence`) when its register closes, so a later change never alters it. An admin can override
  one session's fee.
- **Tournament types have a default fee; each edition has its own.** Scheduling an edition copies the type's default
  (`tournament_types.default_fee_pence` → `tournaments.fee_pence`), and the admin can change it there. (Built.)
- The **quarterly rate** is its own dated schedule (`subscription_fees`), kept on Settings → Fees; there is no single
  club-wide per-session fee. Fees are set with `manage:Fees`.

**Quarterly Members and the Cougars**

- **A quarterly membership is a subscription**, in its own table: `subscriptions` (member_id, starts_on, ends_on). A
  member with a subscription covering a date is a Quarterly Member on that date; anyone without one pays as they go,
  and nothing about it is stored on `members`.
- **The Cougars are `members.cougar`**: whether someone is on the official team. Admins set it on the member sheet; the
  roster seed sets it when it first adds a player (`"cougar": true`) and never changes it after. The team generator
  puts every Cougar on one team first, then balances the rest by rating.
- The two are independent: a Cougar may or may not be a Quarterly Member, and the other way round. In the app,
  "Cougar" always means the official team; quarterly membership is shown as "Quarterly".

**Charges** (not built)

- **Attendance comes from the register**, not sign-ups: on the night one screen lists who signed up, marks no-shows
  and adds walk-ins. Closing the register makes it final.
- **A charge is one person for one session or tournament** at that fee (`charges`: member, session or tournament,
  amount, due_on). Closing a register charges every pay-as-you-go attendee, walk-ins included; subscribers aren't
  charged for training sessions. Tournament entrants are all charged, subscribers included.
- A subscription is charged once, at the start of its quarter, by a quarterly Cron Trigger.

**Payments** (not built)

- **Payments are marked against charges.** On a member's sheet an admin ticks what they paid for (transfer or cash),
  or "Mark all paid", and can untick a mistake; each tick is a payment (`payments`) allocated to that charge
  (`payment_allocations`). Each tick saves as it's made ([0069](0069-members.md)).
- A **bank-statement upload** (later) creates payments by reference and allocates them oldest first, which the admin
  can then re-point. Matching is by the whole reference, never by the name in it.

**What people see**

- A member's **Dues**: what they owe, each session and tournament they were charged for and whether it's paid, and the
  bank details with their reference.
- **What a session collected** is the sum of its paid charges, shown beside what it was due.
- **Unpaid fees** (`read:Dues`), the club's aged-receivables report, is just the unpaid charges, summed per member and
  bucketed by each charge's age: **Due back** (0–30 days), **Late** (31–60), **Very late** (61–90), **Lost tape**
  (over 90). Column totals, a drill-down to each member's charges, CSV export, and an optional reminder email.

## Consequences

- No card fees and no PCI scope. No invoices to draft or send: the reports and a member's tab read straight from
  charges and payments.
- Every pound owed or paid points at a session or tournament: the club can see who paid for what and what each night
  brought in.
- The treasurer can read who paid off the statement without looking anything up. A reference shows a first name and an
  initial to whoever sees the payer's or the club's statement, no more than the payer's own name the bank shows beside
  it. Two people can look alike (`SAM T` and `SAM T2`), so matching is by the whole reference.
- A reference doesn't follow a name change. If someone wants theirs changed, that's an edit by hand, and they must
  update their standing order.
- Dues are only as good as the register; it has to be quick enough that someone does it every Friday. Reopening a
  register to fix a mistake changes charges; corrections are audited ([0095](0095-audit-log.md)).
- "Who's a Quarterly Member this quarter" is a date query on `subscriptions`; history comes for free, lapsing needs no
  update to the member, and pay-as-you-go needs no rows.
- Marking payments one charge at a time is more taps for someone who pays for a month at once; "Mark all paid" covers
  it. Partial payments (£5 of £10) are possible through allocations but have no screen.
- Still open: calendar quarters or a club season, what someone joining mid-quarter pays, concessions, a free first
  session.

## History

- 2026-10-05: Payments by bank transfer quoting a unique reference per invoice (`COU-2611-0042`), monthly invoices
  emailed by the app, reconciled by hand or from a bank CSV; no card provider (was 0007).
- 2026-10-06: No invoices: dues became a ledger of charges fed by the register, one fixed reference per member, payments
  settling the oldest charges first, the Overdue Rentals report (was 0026).
- 2026-10-06: Fees belong to each training (dated) and each tournament edition; a charge is one person for one session
  or tournament, and payments are ticked against charges rather than allocated oldest first (was 0032).
- 2026-10-06: `member_plans` became `subscriptions` (a Quarterly Member is someone with a covering subscription); the
  Cougars became a flag on the member, `members.cougar` (was 0034).
- 2026-10-07: The reference became the member's name, `COUGARS ADRIAN K`, instead of `COU-0004` from their id; the old
  references were cleared, as nobody had paid with one (was 0038).
- 2026-10-08: Overdue Rentals was renamed Unpaid fees in the app and the roadmap; no record of its own.
