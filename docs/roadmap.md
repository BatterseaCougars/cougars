# Roadmap

There are two apps on one D1 database, both on Cloudflare's free tier:

- **`apps/web`**: the public website (port 4500).
- **`apps/ops`**: the club's operations app for attendance, payments and the Kumite (port 4510). It's a separate
  Worker with email magic-link login, so admin code never ships with the public site.

Milestones run in order unless marked as parallel. M1–M4 run as three parallel streams, each in its own git
worktree under `.worktrees/`. Each stream lands on `main` when it passes the pre-push checks. `main` deploys dev;
`release` deploys production ([ADR 0013](adr/0013-main-deploys-dev.md)).

## ✅ M0: New site on main

- Monorepo; team-manager archived.
- Astro site:
  - home
  - Fridays
  - team
  - Kumite
  - events (with `.ics` add-to-calendar)
  - videos (lite YouTube embeds)
  - photos (lightbox)
  - "Try a session" form → D1 `enquiries`
- Video-shop design ([ADR 0009](adr/0009-site-design-direction.md)).
- Sanity Studio with plain-English schemas, a seed, and an editor guide.
- Bitwarden secrets.
- CI:
  - PR checks
  - `main` → dev, `release` → production
  - smoke test
  - Sanity publish → rebuild

## M1: Club facts, checked (stream A, with the developer and team manager)

- [x] List every factual claim the site makes ([club-facts.md](club-facts.md)):
  - times, venue, founded
  - first-session kit
  - fees
  - league
  - pub
  - Kumite frequency and format
  - awards
  - contact and socials
- [ ] Walk the list together:
  - Confirmed facts become seed values, editable in Sanity.
  - Unknown facts come out of the site.

## M2: CMS models the team manager can run (stream A)

- [x] Replace the `siteSettings` document with small singletons: Club, Fridays, Pub, Team, Kumite. Only club facts
      are editable; page wording stays in code.
- [x] `kumiteResult` documents (season, champions, top scorer, event) replace the honours list.
- [x] Validation and help text written for the team manager:
  - alt text required on images
  - email checked
  - venue required
- [x] Studio:
  - project ID from the environment, never in code
  - one Sanity project per environment: Cougars (live) and Cougars Dev ([ADR 0017](adr/0017-two-sanity-projects.md))
  - Vision hidden
  - sidebar in club order
  - deployed from CI
- [x] `content.ts`: each singleton merges with its own fallback, and demo lists work, with tests.
- [x] Derived copy (header clock, footer, meta descriptions) reads from facts, not hard-coded claims.
- [x] [ADR 0014](adr/0014-sanity-public-content.md): Sanity is the source for public content; the team app will write to it through the API;
      ops-only data lives in D1.

## M3: YouTube channel auto-pull (stream B, parallel)

- [ ] Build-time fetch of the club channel's uploads (YouTube Data API v3, free quota). Secret `YOUTUBE_API_KEY`.
- [ ] Sanity `video` documents become optional overrides matched by YouTube ID: pin, retitle, hide.
- [ ] A daily scheduled rebuild picks up new uploads.
- [ ] ADR 0015.
- [ ] Club YouTube channel on batterseahockey@gmail.com, with the filmer as a manager. Today's videos are
      unlisted uploads on a member's personal channel, which the public-uploads pull can't see.
- [ ] Read a playlist on the club channel (optional playlist ID in Club), including unlisted videos in it.

## M4: Live photo gallery (stream C, parallel)

- [ ] `/photos` and album pages read Sanity live at request time, so a published album appears with no
      rebuild.
- [ ] `/photos` shows album covers; photos live on each album's page.
- [ ] The home photo strip refreshes from `/api/photos/latest`, and falls back to build-time photos without
      JavaScript.
- [ ] Album uploads leave the rebuild webhook.
- [ ] ADR 0016.

## M5: Launch

- [ ] Real content entered in Sanity (production dataset).
- [ ] Domain on Cloudflare Registrar. This also switches on form rate limiting and the Cache API for photo
      pages.
- [ ] Email to the club inbox on each new enquiry, plus an auto-reply to the enquirer. This uses the Gmail
      API with an OAuth refresh token for batterseahockey@gmail.com (free, about 500 emails a day), behind a
      small `shared/email.ts`, so it can be switched to Resend once there's a domain.
- [ ] Cloudflare Web Analytics (free, no cookie banner needed).
- [ ] "I'm interested" RSVP on events (stored in D1, counts shown to the admin).
- [ ] Per-page Open Graph images for WhatsApp/Instagram sharing.
- [ ] Go live: `git push origin main:release`.

## M6: Team app: members, attendance, site content

- [ ] `apps/ops` Worker with **magic-link login**:
  - Tables: `admins` (allow-list), `login_tokens` (SHA-256 hashed, single-use, 15-minute expiry).
  - An HMAC-signed session cookie.
- [ ] Tables:
  - `members` (name, email, phone, position F/D, rating, photo, active, joined_on)
  - `sessions` (held_on, venue, fee_pence)
  - `attendance` (session_id, member_id, status)
- [ ] **Rink check-in screen**, made for a phone: search, tap to check in, and add a first-timer in one step.
      Enquiries from the website can be converted into members.
- [ ] **Team generator**:
  - It ports the archived solver to the browser with glpk.js (see `.github/kb/js-solver-port.md`).
  - Because it runs in the browser, it needs no Python server and costs nothing.
  - Teams can be adjusted afterwards with drag and drop.
- [ ] Import players from the archived Airtable base, once.
- [ ] Write events, roster cards and Kumite results to Sanity (write token `SANITY_WRITE_TOKEN`), so the team
      manager can run the website from the team app ([ADR 0014](adr/)).

## M7: Payments and invoices (bank transfer)

- [ ] Tables:
  - `fee_plans` (per session / monthly / concession)
  - `charges`, created from attendance or the member's plan
  - `invoices` (member, period, total_pence, unique reference such as `COU-2611-0042`, status
    draft → sent → paid / void)
  - `payments` (amount_pence, received_on, reference)
- [ ] A monthly **Cron Trigger** (free) drafts invoices. The admin reviews them and presses _Send_. The email
      lists the sessions, the bank details and the reference.
- [ ] Automatic reminders after N days.
- [ ] Reconciliation: mark as paid with one tap, or paste a bank-statement CSV and match lines by reference.
- [ ] Members see their own balance through a magic link.

## M8: Live Kumite (quarterly round robin)

- [ ] Tables:
  - `tournaments` (date, points for a win, draw and loss, game_minutes)
  - `tournament_teams` and `team_players`, drafted with the same solver from that day's check-ins
  - `matches`: round-robin fixtures (circle method)
  - `match_events` (match, team, scorer_id, assist_id, kind, minute)
- [ ] **Live scoring** on a phone (ops app):
  - start/finish buttons for each match
  - a _Goal_ button that opens scorer and assist pickers
  - undo
- [ ] Public **/kumite/live** page on the website. It polls every 10 seconds, with no Durable Objects, so it
      costs nothing. It shows:
  - the current match and results
  - **standings**: points, then goal difference, then goals for, then head-to-head
  - **leaderboards** for goals, assists and points (goals + assists)
- [ ] When the Kumite is finalised, a results page with automatic **awards**:
  - champions
  - top scorer
  - most assists
  - most points
  - optional MVP vote
- [ ] Finalising a Kumite writes a `kumiteResult` to Sanity, which feeds the all-time hall of fame.

Open questions: match length, tiebreak order, whether a draw scores 1 point, and the award list.

## Later: nice to have

- Sponsors page
- Kit orders
- Shareable results images
- A season calendar feed (ICS subscription)

## Free-tier budget

| Service                   | Free allowance                                                | Expected use                              |
| ------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| Cloudflare Workers        | 100k dynamic requests a day; static assets free and unlimited | Form posts, photo pages, live Kumite page |
| D1                        | 5 GB storage, 5M rows read a day                              | Tiny                                      |
| Cron Triggers             | Free                                                          | Monthly invoice run                       |
| Sanity                    | Free plan: 1M CDN, 250k API requests a month; see below       | A handful of editors; live photo reads    |
| Bitwarden Secrets Manager | Free plan, 3 machine accounts                                 | 1                                         |
| GitHub Actions            | 2,000 minutes a month (private repo)                          | About 2 minutes per deploy                |
| YouTube / Gmail API       | Free                                                          | Free                                      |

Sanity Free, checked on [sanity.io/pricing](https://www.sanity.io/pricing) on 2026-10-05: 20 seats, 2 datasets
(public only), 10k documents, 1M API CDN requests and 250k API requests a month, 100 GB of assets, 100 GB of
bandwidth a month. Photo pages read the API CDN live ([ADR 0016](adr/0016-live-photo-gallery.md)).

The only planned cost is a domain, at about £10 a year.
