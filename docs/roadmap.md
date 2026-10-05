# Roadmap

There are two apps on one D1 database, both on Cloudflare's free tier:

- **`apps/web`**: the public website (port 4500).
- **`apps/ops`**: the club's operations app for attendance, payments and the Kumite (port 4510). It's a separate
  Worker with email magic-link login, so admin code never ships with the public site.

## ✅ Phase 1: POC (this branch)

- Monorepo; team-manager archived.
- Astro site:
  - home
  - videos (lite YouTube embeds)
  - events (with `.ics` add-to-calendar)
  - gallery (lightbox)
  - "Try a session" form → D1 `enquiries`
- Sanity Studio with plain-English schemas, a seed of the Wix copy, and an editor guide.
- Bitwarden SM secrets loading; GitHub Actions for PR checks, production deploy and PR preview URLs; smoke
  test; Sanity publish → rebuild.

## Phase 2: Launch

- [ ] Do the account setup ([setup.md](setup.md)), then do a first deploy and add real content.
- [ ] Domain on Cloudflare Registrar. This also switches on form rate limiting.
- [ ] Email to the club inbox on each new enquiry, plus an auto-reply to the enquirer. This uses the Gmail
      API with an OAuth refresh token for batterseahockey@gmail.com (free, about 500 emails a day), behind a
      small `shared/email.ts`, so it can be switched to Resend once there's a domain.
- [ ] Cloudflare Web Analytics (free, no cookie banner needed).
- [ ] "I'm interested" RSVP on events (stored in D1, counts shown to the admin).
- [ ] Per-page Open Graph images for WhatsApp/Instagram sharing.

## Phase 3: Ops app, members and attendance

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

## Phase 4: Payments and invoices (bank transfer)

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

## Phase 5: Cougars Kumite (quarterly round robin)

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
- [ ] An all-time Kumite hall of fame.

Open questions: match length, tiebreak order, whether a draw scores 1 point, and the award list.

## Phase 6: Nice to have

- Sponsors page
- Kit orders
- Shareable results images
- A season calendar feed (ICS subscription)

## Free-tier budget

| Service                   | Free allowance                                                | Expected use                             |
| ------------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| Cloudflare Workers        | 100k dynamic requests a day; static assets free and unlimited | Form posts and the live Kumite page only |
| D1                        | 5 GB storage, 5M rows read a day                              | Tiny                                     |
| Cron Triggers             | Free                                                          | Monthly invoice run                      |
| Sanity                    | Free plan, 20 seats                                           | A handful of editors                     |
| Bitwarden Secrets Manager | Free plan, 3 machine accounts                                 | 1                                        |
| GitHub Actions            | 2,000 minutes a month (private repo)                          | About 2 minutes per deploy               |
| YouTube / Gmail API       | Free                                                          | Free                                     |

The only planned cost is a domain, at about £10 a year.
