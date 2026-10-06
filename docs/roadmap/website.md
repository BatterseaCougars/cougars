# Website roadmap

The public website (`apps/web`, moving to `website/web` in [team-app T0](team-app.md#t0-projects-split-and-app-scaffold))
and the Sanity Studio. Overview, free-tier budget and the other roadmap: [../roadmap.md](../roadmap.md).

Milestones run in order unless marked as parallel. M1–M4 run as three parallel streams, each in its own git
worktree under `.worktrees/`. Each stream lands on `main` when it passes the pre-push checks. `main` deploys dev;
`release` deploys production ([ADR 0013](../adr/0013-main-deploys-dev.md)).

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
- Video-shop design ([ADR 0009](../adr/0009-site-design-direction.md)).
- Sanity Studio with plain-English schemas, a seed, and an editor guide.
- Bitwarden secrets.
- CI:
  - PR checks
  - `main` → dev, `release` → production
  - smoke test
  - daily production rebuild (Studio publishes go live the next morning; ADR 0018)

## ✅ M1: Club facts, checked (stream A, with the developer and team manager)

- [x] List every factual claim the site makes ([club-facts.md](../club-facts.md)):
  - times, venue, founded
  - first-session kit
  - fees
  - league
  - pub
  - Kumite frequency and format
  - awards
  - contact and socials
- [x] Walk the list together:
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
  - one Sanity project per environment: Cougars (live) and Cougars Dev ([ADR 0017](../adr/0017-two-sanity-projects.md))
  - Vision hidden
  - sidebar in club order
  - deployed from CI
- [x] `content.ts`: each singleton merges with its own fallback, and demo lists work, with tests.
- [x] Derived copy (header clock, footer, meta descriptions) reads from facts, not hard-coded claims.
- [x] [ADR 0014](../adr/0014-sanity-public-content.md): Sanity is the source for public content; the team app will write to it through the API;
      ops-only data lives in D1.

## M3: YouTube channel auto-pull (stream B, parallel)

- [x] Live, cached list of the club's videos (YouTube Data API v3, free quota) on `/videos` and the home reel, no
      rebuild ([ADR 0019](../adr/0019-live-videos.md), replacing the build-time pull). Secret `YOUTUBE_API_KEY`.
- [x] Sanity `video` documents become optional overrides matched by YouTube ID: pin, retitle, hide.
- [x] ADR 0015 (superseded by 0019).
- [ ] Club YouTube channel on batterseahockey@gmail.com, with the filmer as a manager. Today's videos are
      unlisted uploads on a member's personal channel, which the public-uploads pull can't see.
- [x] Read a playlist on the club channel (Club → YouTube playlist), including unlisted videos in it.
- [ ] Create `YOUTUBE_API_KEY__PRODUCTION` and `__DEV`.

## M4: Live photo gallery (stream C, parallel)

- [ ] `/photos` and album pages read Sanity live at request time, so a published album appears with no
      rebuild.
- [ ] `/photos` shows album covers; photos live on each album's page.
- [ ] The home photo strip refreshes from `/api/photos/latest`, and falls back to build-time photos without
      JavaScript.
- [x] Photos need no rebuild.
- [ ] ADR 0016.

## M5: Launch

- [ ] Real content entered in Sanity (production dataset).
- [x] Domain: batterseacougars.com, attached by the first `release` deploy (docs/setup.md §6). This also switches
      on form rate limiting and the Cache API for photo pages.
- [x] Email to the club inbox on each new enquiry: Gmail API, `shared/email.ts`, only production reaches real
      people ([ADR 0027](../adr/0027-email-through-gmail-api.md)). Production needs the club account's token
      (`node scripts/gmail-auth.mjs production`).
- [ ] Auto-reply to the enquirer (wording to agree: no invented club facts).
- [ ] Cloudflare Web Analytics (free, no cookie banner needed).
- [ ] "I'm interested" RSVP on events (stored in D1, counts shown to the admin).
- [x] Per-page share pictures for WhatsApp and Facebook, drawn at build time ([ADR 0020](../adr/0020-drawn-share-cards.md)).
- [ ] Go live: `git push origin main:release`.

The old M6 (team app), M7 (payments) and M8 (live Kumite) moved to the [team-app roadmap](team-app.md). The
website's parts of them (public events read from D1, `/kumite/live`) are listed there, in the milestone that
needs them.

## Later: nice to have (website)

- Sponsors page
- Kit orders
- Shareable results images
- A season calendar feed (ICS subscription)
