# Team-app roadmap

A mobile-first app for club members, served from its own Worker (`team/app`, port 4510) on the same D1 database as
the website. It replaces the old `apps/ops` plan (website roadmap M6–M8). Overview and free-tier budget:
[../roadmap.md](../roadmap.md).

Who uses it:

- **Members** see the calendar, say if they're in on Friday, see their team, and check their tab.
- **Contributors** also upload photos (to the website gallery) and videos (to the club YouTube channel).
- **Admins** run members and roles, events, teams, dues, the Kumite and website content.

These are starting roles, not code: every screen and API call is behind an **action**, and a role is a set of
actions that an admin can change in the app ([ADR 0024](../adr/0024-action-based-authorization.md)).

Decisions so far:

| ADR                                                  | Decision                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| [0021](../adr/0021-website-and-team-app-projects.md) | Website and team app are separate projects in one repo              |
| [0022](../adr/0022-team-app-svelte-pwa.md)           | The team app is a mobile-first Svelte 5 SPA on a Worker, as a PWA   |
| [0023](../adr/0023-device-bound-sign-in.md)          | Everyone signs in with a device-bound email code or link, or Google |
| [0024](../adr/0024-action-based-authorization.md)    | Permissions are actions; roles are data built from actions          |
| [0025](../adr/0025-events-in-d1.md)                  | Events live in D1, one club calendar                                |
| [0026](../adr/0026-dues-ledger.md)                   | Dues are a ledger fed by the register                               |
| [0006](../adr/0006-monorepo-and-team-generator.md)   | The team generator runs in the browser                              |
| [0007](../adr/0007-bank-transfer-payments.md)        | Payments by bank transfer with a reference, no card provider        |
| [0018](../adr/0018-rebuilds-until-team-app.md)       | The team app will trigger production rebuilds                       |

## The shell

Copied in shape from Gwenda ops (`gwenda-hackney/ark`, `ops/site/src/app/`), which works well on a phone:

- **One route tree** (`nav-routes.ts`). The phone tabs are derived from it (`mobile-nav.ts`), so the two can't drift
  apart. Each route declares the action it needs; routes the member can't use are hidden.
- **Phones (≤900px):**
  - a bottom bar of 5 tabs, `3.5rem + env(safe-area-inset-bottom)` high
  - a `100dvh` shell where only the content scrolls, with `viewport-fit=cover`
  - each tab remembers the last page used in it; tapping the active tab goes to its first page, then scrolls to
    the top
  - a strip of sub-pages along the top when a tab has more than one page
  - **More** is a full page, and its pages show a `‹ More` back link
  - editors hide the tabs and show their own back bar, with an unsaved-changes guard
- **Desktop:** a collapsible side rail.
- **Tabs**, most-used first:
  - **Home**: am I in this Friday, my team, my tab, notices
  - **Friday**: who's in (in sign-up order) and the teams, your team first; the register for the door
  - **Calendar**: every club event
  - **Kumite**: games, standings, draft
  - **More**: the club (teammates, upload), you (profile, tab) and **Settings** for admins, grouped People and Money
- **Account badge**, top right: your name, profile, tab, sign out, and **View as a member** for admins
  ([ADR 0027](../adr/0027-view-as-a-member.md)). On desktop the rail lists the same pages, with Settings folding
  open.
- **Look:** the club's red, white and carbon, and the logo, in a plain readable app font. The video-shop styling
  stays on the website and in names (Overdue Rentals); working screens stay plain.
- **PWA:** a manifest, icons and a service worker that caches the app shell, so it installs to the home screen and
  opens offline. A store app (Capacitor) is T9.

## T0: Projects split and app scaffold

- [ ] Move `apps/web` → `website/web` and `apps/studio` → `website/studio`
      ([ADR 0021](../adr/0021-website-and-team-app-projects.md)). Fix what points at the old paths:
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
- [ ] Apply for the YouTube API compliance audit, so that uploads (T7) can be public. It can take weeks.

## T1: Accounts, actions and roles

[ADR 0023](../adr/0023-device-bound-sign-in.md), [ADR 0024](../adr/0024-action-based-authorization.md).

- [ ] Migrations:
  - `members` (name, email, phone, position F/D, rating, cougar, photo, status pending/active/inactive, joined_on,
    payment reference)
  - `login_challenges` (hashed code and link token, nonce hash, attempts, expires_at, used_at)
  - `auth_sessions`
  - `roles`, `role_actions`, `member_roles`, `audit_log`
- [ ] `shared/email.ts` on the Gmail API (also used by the website's enquiry email, M5).
- [ ] Sign-in: email → 6-digit code (or the link, on the same device) → session. "Sign in with Google" as a
      shortcut for a member whose Google email matches.
- [ ] The action catalog (`actions.ts`), the API wrapper that denies by default, `/api/me` returning the member's
      actions, and a test that every route declares an action that exists.
- [ ] Seeded roles: Member, Contributor, Admin. The first admin's email is a setting.
- [ ] Screens:
  - sign-in, and **request access** (name, email, phone, position)
  - **Members** (admin): approve requests, assign roles, set position, rating and the cougar flag
  - **Roles** (admin): create a role, tick its actions; the last admin can't be removed
  - **Profile**: own details and photo
- [ ] **View as a member** (`impersonate:Member`, [ADR 0027](../adr/0027-view-as-a-member.md)): an admin sees the
      app exactly as a member does, read-only, from the account badge.
- [ ] One-off import of players from the archived Airtable base. Website enquiries can be turned into members.
- [ ] Secrets, each documented in [README.md#secrets](../../README.md#secrets): `TEAM_SESSION_SECRET`, the Gmail
      OAuth client and refresh token for batterseahockey@gmail.com, and the Google sign-in OAuth client.

## T2: Calendar, sign-up and the register

[ADR 0025](../adr/0025-events-in-d1.md).

- [ ] Migrations: `events`, `event_series`, `attendance` (event, member, sign-up in/out/waitlist and when, attended,
      walk-in, recorded_by, recorded_at).
- [ ] The **Friday hockey series**: a weekly rule; a Cron Trigger keeps the next 8 Fridays created. Each Friday can
      be edited, moved or cancelled on its own.
- [ ] **Calendar** tab: upcoming events as a list (month view later), each with an "add to calendar" `.ics`.
- [ ] Admins (`create:Event`, `update:Event`) add one-off events (Kumite, socials, anything) with: public or members
      only, sign-up on/off, capacity, sign-up cutoff, fee.
- [ ] **Sign-up is the normal path.** Members tap _In_ or _Out_; a full event has a waitlist that moves up
      automatically. Teams are built from sign-ups (T3), so Home keeps asking until you answer for this Friday.
- [ ] **The register** (`record:Attendance`), so a trusted regular can do the door, not only an admin:
  - one phone screen for the night; everyone signed up is listed as expected
  - one tap marks a no-show; search and tap adds a **walk-in**; a first-timer is added in one step
  - a walk-in can be dropped straight onto a team
  - **Close the register** at the end of the night: attendance is final and feeds dues (T4). An admin can reopen it
    to correct a mistake; corrections are audited.
- [ ] Website: the events and Fridays pages read public events from D1 live, with a cache (like the videos,
      [ADR 0019](../adr/0019-live-videos.md)). Existing Sanity events are imported once, then the Sanity `event`
      type is retired.
- [ ] Europe/London dates: `dates.ts` moves to `shared/` so both projects use it.

## T3: Team generator

[ADR 0006](../adr/0006-monorepo-and-team-generator.md).

- [ ] Port the **current** solver, `archive/team-manager/lib/solver_lp.py`, to TypeScript on glpk.js. The port in
      `.github/kb/js-solver-port.md` is a starting point but out of date: it hardcodes 3 teams, and lacks the team
      count from the number of players, minimum team sizes, the defender spread, rank balance, the time limit and
      the snake-draft fallback.
- [ ] Run it in a Web Worker in the admin's browser, so the screen stays responsive.
- [ ] Tests with fixture rosters (6, 14, 15, 21, 22, 30 players; few defenders; many cougars).
- [ ] After sign-up closes, an admin (`generate:Teams`) generates teams, adjusts them by drag and drop, and
      publishes (`publish:Teams`). Each member then sees their team on Home.
- [ ] Migrations: `teams`, `team_players` (on `event_id`).

## T4: Dues and payments

[ADR 0026](../adr/0026-dues-ledger.md), [ADR 0007](../adr/0007-bank-transfer-payments.md).

- [ ] **Fees**, set by an admin (`manage:Fees`) on a dated schedule (`fees`: kind, amount_pence, effective_from). A
      new fee applies from its date; charges already made keep their amount.
  - **Quarterly subscription:** covers every Friday in the quarter; charged at the start of the quarter.
  - **Per session:** pay as you go; charged for each session attended.
- [ ] **Plans:** `member_plans` (member, subscription or pay as you go, from, to).
- [ ] **Charges come from the register, not from sign-ups:**
  - closing a register charges every pay-as-you-go attendee, walk-ins included; subscribers aren't charged
  - a quarterly Cron Trigger charges subscribers
  - `charges` (member, kind, event or quarter, amount_pence, due_on, voided_at)
- [ ] **Payments** by bank transfer, quoting the member's fixed reference (for example `COU-0042`). An admin
      (`record:Payment`) records one in a couple of taps; it settles the oldest charges first
      (`payments`, `payment_allocations`).
- [ ] **My tab**: what I owe, my charges and payments, and the bank details with my reference.
- [ ] **Overdue Rentals**, the club's aged-receivables report (`read:Dues`):
  - everyone who owes, with their total split by how long it's been owed: **Due back** (0–30 days), **Late**
    (31–60), **Very late** (61–90), **Lost tape** (over 90)
  - column totals, a drill-down to each member's ledger, CSV export
  - an optional reminder email from the report
- [ ] Later: paste a bank-statement CSV and match lines by reference.

Open questions: calendar quarters or a club season; what someone joining mid-quarter pays; concessions; whether a
first session is free.

## T5: Kumite game tracker

- [ ] Migrations:
  - `tournaments` (event, points for a win, draw and loss, game minutes)
  - `tournament_teams`, `tournament_players`
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
- [ ] Website: a public `/kumite/live` page polling every 10 seconds (no Durable Objects, so free).
- [ ] Finalising a Kumite writes a `kumiteResult` to Sanity (champions, top scorer, best goalie), feeding the hall
      of fame.

Open questions: match length, tiebreak order, whether a draw scores 1 point, the award list.

## T6: Kumite draft

- [ ] An admin (`run:Draft`) picks the captains and the players in the draft (by default, that day's register).
- [ ] **The draft room** on the captains' phones, refreshing every 2–3 seconds: whose pick it is, a pick clock, the
      players left with their positions, and a _Pick_ button (`pick:Draft`, for that draft's captains only).
- [ ] Picks are saved with a unique pick number, so two taps at once can't both count. An admin can undo or make a
      pick.
- [ ] Pick order is a setting (snake by default) until the rules are written.
- [ ] Drafted teams go straight into the tournament (T5).

Open questions: the rules; whether captains see ratings; the pick time limit; whether the solver can suggest
teams instead.

## T7: Contributor uploads

Can start any time after T1.

- [ ] **Photos → website gallery** (`upload:Photo`): resized on the phone, sent through the Worker to Sanity
      (`SANITY_WRITE_TOKEN`) into a chosen or new album. An admin (`publish:Media`) publishes the album; the website
      shows it live ([ADR 0016](../adr/0016-live-photo-gallery.md)).
- [ ] **Videos → YouTube** (`upload:Video`): the Worker opens a resumable upload on the club channel (OAuth for
      batterseahockey@gmail.com, `youtube.upload`), and the phone sends the file straight to YouTube, so the Worker's
      100 MB request limit doesn't apply. Videos go up unlisted and into the club playlist the website reads
      ([ADR 0019](../adr/0019-live-videos.md)); an admin makes them public.
- [ ] Quota: an upload costs about 1,600 of the 10,000 daily units, so about 6 uploads a day.

Depends on: the club YouTube channel (website M3), the API audit (T0), and a spike confirming the browser can send
to YouTube's resumable upload URL.

## T8: Website content from the app

- [ ] Edit the club facts, roster cards and Kumite results in Sanity (`edit:Content`), so the team manager doesn't
      need the Studio. Events are already in D1 (T2).
- [ ] An enquiries inbox (website "Try a session" form).
- [ ] Start a production rebuild when content changes, batched after a few quiet minutes, with a GitHub token held
      by the team Worker ([ADR 0018](../adr/0018-rebuilds-until-team-app.md)).

## T9: Notifications and store app

- [ ] Web Push: "are you in this Friday?", "teams are out", "the draft starts", dues reminders. Free, but needs VAPID
      keys (secrets); on iPhone it works only once the app is installed to the home screen.
- [ ] A store app: wrap the same SPA with Capacitor. The store fees aren't free (Apple about $99 a year, Google $25
      once), so this needs a decision under [ADR 0003](../adr/0003-free-tiers-only.md).
