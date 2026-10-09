# Team-app roadmap

**Cougars Fresh Meat** (the team app in these docs and in code): a mobile-first app for club members, served from its own Worker (`team/app`, port 4510) on the same D1 database as
the website. It replaces the old `apps/ops` plan (website roadmap M6–M8). Overview and free-tier budget:
[../roadmap.md](../roadmap.md).

Who uses it:

- **Members** see the calendar, say if they're in on Friday, see their team, and check their tab.
- **Contributors** also upload photos (to the website gallery) and videos (to the club YouTube channel).
- **Admins** run members and roles, trainings and tournaments, teams, dues and website content.

These are starting roles, not code: every screen and API call is behind an **action**, and a role is a set of
actions that an admin can change in the app ([ADR 0024](../adr/0024-action-based-authorization.md)).

Decisions so far:

| ADR                                                     | Decision                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [0006](../adr/0006-one-repo-two-projects.md)            | Website and team app are separate projects in one repo                       |
| [0022](../adr/0022-team-app-svelte-pwa.md)              | The team app is a mobile-first Svelte 5 SPA on a Worker, as a PWA            |
| [0023](../adr/0023-sign-in-and-sessions.md)             | Everyone signs in with a device-bound email code or link, or Google          |
| [0024](../adr/0024-action-based-authorization.md)       | Permissions are actions; roles are data built from actions                   |
| [0030](../adr/0030-training-and-tournament-schedule.md) | Training repeats as a series; tournaments are typed and scheduled one by one |
| [0007](../adr/0007-dues-and-payments.md)                | Dues are a ledger fed by the register                                        |
| [0006](../adr/0006-one-repo-two-projects.md)            | The team generator runs in the browser                                       |
| [0007](../adr/0007-dues-and-payments.md)                | Payments by bank transfer with a reference, no card provider                 |
| [0004](../adr/0004-astro-workers-sanity-d1.md)          | The team app will trigger production rebuilds                                |

## The shell

Copied in shape from Gwenda ops (`gwenda-hackney/ark`, `ops/site/src/app/`), which works well on a phone:

- **One route tree** (`nav-routes.ts`). The phone tabs are derived from it (`mobile-nav.ts`), so the two can't drift
  apart. Each route declares the action it needs; routes the member can't use are hidden.
- **Phones (≤900px):**
  - a bottom bar of 5 tabs, `3.5rem + env(safe-area-inset-bottom)` high
  - a `100dvh` shell where only the content scrolls, with `viewport-fit=cover`
  - each tab remembers the last page used in it; tapping the active tab goes to its first page, then scrolls to
    the top
  - a slim top bar with the page's name (or its section's pages), its actions, and a Filters button that opens
    the page's filters in a bottom sheet; lists that need it have a search field at the top. Home has no bar.
  - **More** is a full page, and its pages show a `‹ More` back link
  - editors hide the tabs and show their own back bar, with an unsaved-changes guard
- **Desktop:** the page has the whole screen. A dock of the main sections (Home, each training, Calendar, each
  tournament type, the club pages, Settings) floats mid-left as glass tiles with a label on hover; the brand mark
  sits top-left, your badge top-right. A page opens with its title; the toolbar row under it (a section's pages as
  pills, search, filter chips, the page's buttons) docks just under the top as the page scrolls, with a veil of
  the page's own background fading in behind it rather than a bar. A page with a row stays a little taller than
  the window, and a filter that leaves a few results brings them up under the docked row, so the row never moves
  under the pointer.
- **Tabs**, most-used first:
  - **Home**: am I in this Friday, my team, my tab, notices
  - **Friday**: who's in (in sign-up order) and the teams, your team first; the register for the door
  - **Calendar**: every club event
  - **Kumite**: games, standings, draft
  - **More**: the club (teammates, upload), you (profile, tab) and **Settings** for admins, grouped People and Money
- **Account badge**, top right: your name, profile, tab, sign out, and **View as a member** for admins
  ([ADR 0024](../adr/0024-action-based-authorization.md)). On desktop the rail lists the same pages, with Settings folding
  open.
- **Look:** the club's red, white and carbon, and the logo, in a plain readable app font. The video-shop styling
  stays on the website; working screens, and their names, stay plain.
- **PWA:** a manifest, icons and a service worker that caches the app shell, so it installs to the home screen and
  opens offline. A store app (Capacitor) is T9.

## T0: Projects split and app scaffold

- [ ] Move `apps/web` → `website/web` and `apps/studio` → `website/studio`
      ([ADR 0006](../adr/0006-one-repo-two-projects.md)). Fix what points at the old paths:
  - root workspaces and scripts (`db:migrate:local`)
  - `deploy.yml` and `pr.yml`
  - `wrangler.jsonc` `migrations_dir`, `scripts/ci/target.mjs`, `scripts/worktree.sh`, `scripts/deploy-dev.sh`
  - `.vscode/tasks.json` (the "dev: ops" task becomes "dev: team"), devcontainer labels
  - README, CLAUDE.md, docs
- [ ] Scaffold `team/app` (`@cougars/team`):
  - Svelte 5 + Vite, the shell and tabs above, empty pages
  - a Worker serving the built assets, with `/api/*` handled in code and `/api/health`
  - the D1 binding `DB` to the same database as the website; migrations stay in `db/`
  - manifest, icons, and a service worker caching the app shell
  - Vitest, lint, `svelte-check`
- [ ] CI: a team-app job in `deploy.yml` with the same flow (`main` → `cougars-team-dev`, `release` →
      `cougars-team`, PRs → preview alias), a smoke test, and the checks in `pr.yml`.

## T1: Accounts, actions and roles

[ADR 0023](../adr/0023-sign-in-and-sessions.md), [ADR 0024](../adr/0024-action-based-authorization.md).

- [x] Migrations: `members` (name, email, phone, position F/D/G, rating, cougar, photo, status
      pending/active/inactive, joined_on, payment reference), `roles`, `role_actions`, `member_roles`
      (`0003_team_people.sql`).
- [x] Migrations: `login_challenges` (hashed code, nonce hash, attempts, expires_at, used_at),
      `auth_sessions`, `audit_log` (`0008_team_sign_in.sql`).
- [x] The team app's Worker (`team/app/worker/`): `/api/*` in code, the built app for the rest, D1 bound as `DB`.
      It runs inside Vite on :4510, sharing the website's local D1. Not deployed until sign-in exists: until then
      only a local dev server answers, signed in as the first admin.
- [x] `shared/email.ts` on the Gmail API (also used by the website's enquiry email, M5).
- [x] Sign-in: email → 6-digit code, typed in the same browser → session (`worker/auth.ts`,
      [ADR 0023](../adr/0023-sign-in-and-sessions.md)). Locally the code shows on screen.
- [ ] "Sign in with Google" as a shortcut for a member whose Google email matches.
- [ ] Deploy the team Worker to dev through CI, with the Gmail secrets, then production.
- [x] The action catalog (`actions.ts`), the API wrapper that denies by default, `/api/bootstrap` returning the
      member's actions with the club's data, and a test that every route declares an action that exists.
- [x] Seeded roles: Member, Contributor, Door, Admin. The first admin is whoever the roster makes Admin.
- [ ] Screens:
  - [x] sign-in, and **request access** (name, email, phone, position)
  - **Members** (admin): approve requests, assign roles, set position, rating and the cougar flag
  - **Roles** (admin): create a role, tick its actions; the last admin can't be removed
  - **Profile**: own details and photo
- [ ] **View as a member** (`impersonate:Member`, [ADR 0024](../adr/0024-action-based-authorization.md)): an admin sees the
      app exactly as a member does, read-only, from the account badge.
- [x] Import of players from the Airtable base: the roster seed from Secrets Manager
      ([ADR 0024](../adr/0029-personal-data.md), [db/seed/README.md](../../db/seed/README.md)).
- [ ] Website enquiries can be turned into members.
- [ ] Secrets, each documented in [README.md#secrets](../../README.md#secrets): the Gmail OAuth client and refresh
      token (the website's, shared) and the Google sign-in OAuth client. No session key
      ([ADR 0023](../adr/0023-sign-in-and-sessions.md)).

## T2: Training, calendar, sign-up and the register

[ADR 0030](../adr/0030-training-and-tournament-schedule.md); tables in [the data model](../team-app-data-model.md).

- [x] Migrations: `training_series`, `training_sessions`, `tournament_types`, `tournaments`, `club_events`
      (`0004_team_schedule.sql`), seeded with Friday Training (every Friday, 19:30–21:30, Battersea Sports Centre,
      21 skaters and 3 goalies) and the Kumite (no dates yet).
- [x] Migrations: `attendance`, `club_event_entries` (and `tournament_entries`, ahead of T5)
      (`0005_team_entries.sql`). In/out/waitlist, admin add and remove, and the register's walk-ins and no-shows are
      stored; the waitlist moves up on the server.
- [ ] **Settings → Training** (`manage:Training`): add a series (name, icon and colour, every N weeks on which days,
      first and optional last session, times, venue, skater and goalie places). Sessions are made 12 weeks ahead
      (on each load for now; a daily Cron Trigger once deployed); a session can be cancelled, moved or changed on
      its own. Each series gets its own page and menu link.
- [ ] **Settings → Tournaments** (`manage:Tournament`): add a tournament type (name, icon and colour, points, game
      length, captains' draft) and schedule its editions (name, date, location, status). Each type gets a folding
      menu section.
- [ ] **Calendar**: sessions, tournaments and one-offs as one list, each with its icon and colour, filter chips at
      the top, and an "add to calendar" `.ics`. Admins (`create:Event`) add one-off events here.
- [x] **Sign-up is the normal path.** Members tap _In_ or _Out_; a full event has a waitlist that moves up
      automatically. Teams are built from sign-ups (T3), so Home keeps asking until you answer for this Friday.
- [x] **The register** (`record:Attendance`), so a trusted regular can do the door, not only an admin:
  - one phone screen for the night; everyone signed up is listed as expected
  - one tap marks a no-show; search and tap adds a **walk-in**; a first-timer is added in one step
  - a walk-in can be dropped straight onto a team
  - **Close the register** at the end of the night: attendance is final and feeds dues (T4). An admin can reopen it
    to correct a mistake; corrections are audited.
- [x] Website: the home page's What's on reads the next trainings, tournaments and events from D1 live
      ([ADR 0042](../adr/0042-website-reads-the-club-agenda.md)). One-off events have a description, an end time,
      _Show on the website_, and can be edited and cancelled.
- [ ] Website: the events and Fridays pages read public dates from D1 live, with a cache (like the videos,
      [ADR 0016](../adr/0016-photos-and-videos-read-live.md)). Existing Sanity events are imported once, then the Sanity `event`
      type is retired.
- [ ] Europe/London dates: `dates.ts` moves to `shared/` so both projects use it.

## T3: Team generator

[ADR 0006](../adr/0006-one-repo-two-projects.md).

- [ ] Port the **current** solver, `archive/team-manager/lib/solver_lp.py`, to TypeScript on glpk.js. The port in
      `.github/kb/js-solver-port.md` is a starting point but out of date: it hardcodes 3 teams, and lacks the team
      count from the number of players, minimum team sizes, the defender spread, rank balance, the time limit and
      the snake-draft fallback.
- [ ] Run it in a Web Worker in the admin's browser, so the screen stays responsive.
- [ ] Tests with fixture rosters (6, 14, 15, 21, 22, 30 players; few defenders; many cougars).
- [ ] After sign-up closes, an admin (`generate:Teams`) generates teams, adjusts them by drag and drop, and
      publishes (`publish:Teams`). Each member then sees their team on Home.
- [x] Migrations: `session_teams`, `session_team_players` (on `session_id`) (`0006_team_teams_quips_bios.sql`): published teams are stored; dropping out or being taken off
      takes you off your team.

## T4: Dues and payments

[ADR 0007](../adr/0007-dues-and-payments.md).

- [ ] **Fees** ([ADR 0007](../adr/0007-dues-and-payments.md)), set by an admin (`manage:Fees`):
  - **Each training** has a fee that applies from a date going forward (`series_fees`); a session keeps the fee
    it was held at, and one session's fee can be overridden.
  - **Each tournament type** has a default fee; scheduling an edition copies it, and it can be changed there.
  - **Quarterly subscription:** covers every training session in the quarter; charged at the start of it.
- [ ] **Quarterly Members:** `subscriptions` (member, from, to); no subscription is pay as you go
      ([ADR 0007](../adr/0007-dues-and-payments.md)).
- [ ] **Charges are one person for one session or tournament**, made from the register, not from sign-ups:
  - closing a register charges every pay-as-you-go attendee, walk-ins included; subscribers aren't charged
  - tournament entrants are all charged the edition's fee
  - a quarterly Cron Trigger charges subscribers
- [ ] **Marking payments**: on a member's profile an admin ticks which sessions and tournaments they paid for
      (transfer or cash), or "Mark all paid"; each session shows what it collected against what it was due.
- [ ] **Payments** by bank transfer, quoting the member's fixed reference (their name, for example `COUGARS ADRIAN K`). Uploading a
      bank statement creates payments by reference and allocates them oldest first; an admin can re-point them
      (`payments`, `payment_allocations`).
- [ ] **Dues**: what I owe, each session and tournament I was charged for and whether it's paid, and the bank
      details with my reference.
- [ ] **Unpaid fees** (was Overdue Rentals), the club's aged-receivables report (`read:Dues`): the unpaid charges, added up.
  - everyone who owes, with their total split by how long it's been owed: **Due back** (0–30 days), **Late**
    (31–60), **Very late** (61–90), **Lost tape** (over 90)
  - column totals, a drill-down to each member's ledger, CSV export
  - an optional reminder email from the report

Open questions: calendar quarters or a club season; what someone joining mid-quarter pays; concessions; whether a
first session is free.

## T5: Kumite game tracker

- [ ] Migrations:
  - `tournament_entries`, `tournament_teams`, `tournament_team_players` (the types and editions come in T2)
  - `matches`: round-robin fixtures (circle method)
  - `match_events`: append-only, with IDs made on the phone (start, pause, resume, period, goal, assist, end, undo)
- [ ] **The game screen** (`score:Match`), made for one hand at the rink:
  - a big clock: start, pause, resume, periods; vibrate and sound at zero
  - the screen stays on (Screen Wake Lock)
  - a _Goal_ button that opens the scorer and assist pickers
  - undo
- [ ] **Works offline.** Events are saved on the phone (IndexedDB) and sent when there's signal; sending twice is
      harmless.
- [ ] Standings (points, then goal difference, then goals for, then head-to-head) and leaderboards (goals, assists,
      points).
- [ ] Website: a public `/kumite/live` page polling every 10 seconds (or the team app's live hub, ADR 0072).
- [ ] Finalising a Kumite writes a `kumiteResult` to Sanity (champions, top scorer, best goalie), feeding the hall
      of fame.

Open questions: match length, tiebreak order, whether a draw scores 1 point, the award list.

## T6: Kumite draft

- [x] An admin sets a draft tournament's captains, in pick order, and its draft night; the pool is the members who
      said they're in once sign-up opened; captains are in automatically ([ADR 0030](../adr/0030-training-and-tournament-schedule.md),
      [ADR 0060](../adr/0060-the-draft.md)).
- [x] An admin opens the draft on the night and closes it once everyone's picked (or leaving the rest out); closed
      locks the teams. Captains see "Draft on …, you pick 2nd" on Home, then "it's your pick".
- [x] **The draft room** for that draft's captains and those running it (`run:Draft`): whose pick it is, the
      players left, and a _Pick_ button for the captain on the clock. Refreshes every 10 seconds, not 2–3, to stay
      inside the free plan ([ADR 0055](../adr/0055-degrade-instead-of-break.md)).
- [x] A pick only counts if nobody picked since, so two taps at once can't both count. An admin can undo or make a
      pick. Snake order. Told as a story in `tournament.use-cases.test.ts`.
- [ ] A pick clock, and positions on the players left.
- [ ] Pick order as a setting, once the rules are written.
- [x] Drafted teams go into the tournament: the app makes the fixtures (a round robin, then the playoffs set for it,
      e.g. a Final of 1st v 2nd), admins enter final scores, the table fills the playoffs
      ([ADR 0061](../adr/0061-fixtures-games-and-scoring.md)).

Open questions: the rules; whether captains see ratings; the pick time limit; whether the solver can suggest
teams instead.

## T7: Contributor uploads

Can start any time after T1.

- [ ] **Photos → website gallery** (`upload:Photo`): resized on the phone, sent through the Worker to Sanity
      (`SANITY_WRITE_TOKEN`) into a chosen or new album. An admin (`publish:Media`) publishes the album; the website
      shows it live ([ADR 0016](../adr/0016-photos-and-videos-read-live.md)).
- [x] **Videos are uploaded on YouTube, not in the app** ([ADR 0016](../adr/0016-photos-and-videos-read-live.md)).
      Upload links people with `upload:Video` to YouTube, where they upload as the club channel with their own
      access, unlisted and into the club playlist the website reads ([ADR 0016](../adr/0016-photos-and-videos-read-live.md)).

Depends on: the club YouTube channel (website M3).

## T8: Website content from the app

- [ ] Edit the club facts, roster cards and Kumite results in Sanity (`edit:Content`), so the team manager doesn't
      need the Studio. Events are already in D1 (T2).
- [ ] An enquiries inbox (website "Try a session" form).
- [ ] Start a production rebuild when content changes, batched after a few quiet minutes, with a GitHub token held
      by the team Worker ([ADR 0004](../adr/0004-astro-workers-sanity-d1.md)).

## T9: Notifications and store app

- [ ] Web Push: "are you in this Friday?", "teams are out", "the draft starts", dues reminders. Free, but needs VAPID
      keys (secrets); on iPhone it works only once the app is installed to the home screen.
- [ ] A store app: wrap the same SPA with Capacitor. The store fees aren't free (Apple about $99 a year, Google $25
      once), so this needs a decision under [ADR 0003](../adr/0003-free-tiers-only.md).
