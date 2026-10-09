# 0057. Team app pages load when opened, and a change replies with the parts of the club it touched

- **Status:** Accepted
- **Date:** 2026-10-07 · updated 2026-10-09
- **Merges:** 0081

## Context

After every change (an in or out, a register tick, a saved member), the team app reloaded the whole club from
`/api/bootstrap`: every member with their counts, roles, venues, series, a month of sessions with their sign-ups and
teams, tournaments, events and quips. A busy Friday is hundreds of these, nearly all of it unchanged, against D1's 5M
rows read a day and the 100k Worker requests a day. The bootstrap's ETag ([0053](0053-live-reads-are-cached.md))
doesn't help here: a change always changes the version.

The app also shipped every page and editor in one chunk: 347 KB of JavaScript (105 KB gzipped) on top of Svelte's
runtime, parsed on a phone before the first paint, whether you open Home or the Draft. AG Grid (the Members table) was
already loaded only when shown, but registered all of its community modules: 1.1 MB (312 KB gzipped).

## Decision

**Changes reply with what they touched.**

- The club is read in named parts (`SLICES` in `team/app/worker/api.ts`): everydayRole, members, roles, venues,
  series, sessions (with sign-ups and teams), tournamentTypes, tournaments, clubEvents, quips,
  settings, agenda. The bootstrap is all of them.
- Every route that isn't a GET declares `changes`: the parts it can touch. A test fails if one doesn't. For example,
  an in or out touches its own kind (sessions, tournaments or clubEvents); a register tick touches sessions and
  members (a past session is what "played" counts); renaming a role touches roles and members.
- A successful change replies with what it said before (`ok`, a new `id`) plus `changed`: those parts, read after the
  change, as this member may see them ([0036](0036-api-security.md)). After a change to members or roles, they're read
  with the member's actions as they are now.
- The app puts `changed` in place (`applySlices` in `demo/data.ts`) and leaves the rest alone, with no second request.
  The whole club is read when the app opens, after a failed change, and when the app comes back into view (another
  tab, the phone unlocked), where the ETag makes it one row read if nothing changed.
- The same declared parts are what the live hub announces to open live pages ([0072](0072-live-updates.md)).

**Pages load when opened.**

- Each page is its own chunk (`LOADERS` in `app/pages.svelte.ts`). `main.ts` loads the page you're opening alongside
  the app, so the first paint has it. Once the app's up, the pages you're allowed to open load one at a time while
  the phone's idle, so moving between them doesn't wait.
- A page that isn't in yet when you get to it (a tap before the background load reached it) shows the moment it is.
- AG Grid registers only the modules the grid uses (client-side rows, quick filter, cell classes, auto-size; sorting,
  resizing and pinning are in its core), plus its validation module in dev, which names a missing one.

## Consequences

- A tap costs one request and reads only its part of the club, not all of it.
- Outside live pages, other members' changes arrive when the app comes back into view or on the next change to the
  same part, not after every change of your own.
- A new change route must name what it touches. Naming too little leaves the app (and live pages) showing stale data
  until the next full read; naming too much just reads more.
- Before first paint on Home: 402 KB → 154 KB of JavaScript (126 → 61 KB gzipped). AG Grid: 1.1 MB → 669 KB (312 →
  184 KB gzipped), and still only for admins on Members.
- A new page is added to `LOADERS` in `app/pages.svelte.ts`, not imported by `App.svelte`.
- More, smaller files. Vite preloads a chunk's imports with it, so they arrive together rather than one after another;
  the service worker caches them as they're used.
- A grid feature beyond those modules (a column filter, CSV export) needs its module added in `DataGrid.svelte`; in dev
  AG Grid says which.

## History

- 2026-10-07: The club read in named slices; every change declares and replies with the parts it touched, instead of
  the app reloading the whole bootstrap (was 0057).
- 2026-10-08: Each page its own chunk, loaded when opened and the rest while idle; AG Grid trimmed to the modules it
  uses (was 0081).
- 2026-10-09: The declared slices also drive the live hub's change events (ADR 0072).
