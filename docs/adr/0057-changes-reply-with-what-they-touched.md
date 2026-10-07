# 0057. A change replies with the parts of the club it touched

- **Status:** Accepted. Amends [0054](0054-live-reads-are-cached-everywhere.md) (its "after a change, the app still
  reloads everything").
- **Date:** 2026-10-07

## Context

After every change (an in or out, a register tick, a saved member), the team app reloaded the whole club from
`/api/bootstrap`: every member with their counts, roles, venues, series, a month of sessions with their sign-ups and
teams, tournaments, events and quips. A busy Friday is hundreds of these, nearly all of it unchanged, against D1's
5M rows read a day and the 100k Worker requests a day. The ETag (ADR 0054) doesn't help here: a change always
changes the version.

## Decision

- The club is read in named parts (`SLICES` in `team/app/worker/api.ts`): everydayRole, members, roles, venues,
  series, sessions (with sign-ups and teams), tournamentTypes, tournaments, clubEvents, quips. The bootstrap is all of
  them.
- Every route that isn't a GET declares `changes`: the parts it can touch. A test fails if one doesn't. For example,
  an in or out touches its own kind (sessions, tournaments or clubEvents); a register tick touches sessions and
  members (a past session is what "played" counts); renaming a role touches roles and members.
- A successful change replies with what it said before (`ok`, a new `id`) plus `changed`: those parts, read after the
  change, as this member may see them (ADR 0036). After a change to members or roles, they're read with the
  member's actions as they are now.
- The app puts `changed` in place (`applySlices` in `demo/data.ts`) and leaves the rest alone, with no second
  request. The whole club is read when the app opens, after a failed change, and when the app comes back into view
  (another tab, the phone unlocked), where the ETag makes it one row read if nothing changed.

## Consequences

- A tap costs one request and reads only its part of the club, not all of it.
- Other members' changes now arrive when the app comes back into view or on the next change to the same part, not
  after every change of your own.
- A new change route must name what it touches. Naming too little leaves the app showing stale data until the next
  full read; naming too much just reads more.
