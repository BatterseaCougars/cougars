# 0029. Personal data stays out of the repo, the roster is seeded from Secrets Manager, and nothing is kept longer than needed

- **Status:** Accepted
- **Date:** 2026-10-06 · updated 2026-10-10
- **Merges:** 0033

## Context

The repo is public, and git history keeps whatever was ever committed. Keeping it public matters: public repos get
unlimited GitHub Actions minutes, a private one gets 2,000 a month on the free plan
([ADR 0003](0003-free-tiers-only.md)). The team app starts with the club's 27 players: names, positions and skill
ratings, plus who is an admin and an email to sign in with. A seed file with those in it would publish them for good.
The data also has to reach dev and production without anyone running commands against production by hand
([ADR 0010](0010-environments-and-deploys.md)).

UK GDPR expects the privacy notice to say how long personal data is kept, and the club to keep it no longer. The
"Try a session" form stores a name, email and optional phone and message in D1 (`enquiries`), and each enquiry is
emailed to the club inbox ([ADR 0027](0027-email-through-gmail-api.md)). The club chose 12 months on 2026-10-06.

## Decision

**Personal data never goes in the repo.**

- The club's seed (`db/seed/club.sql`, [ADR 0050](0050-schema-and-seed-until-launch.md)) holds only what isn't about
  people: roles and their actions, Friday Training, the Kumite.
- **The roster** is one line of JSON stored as `TEAM_ROSTER` (dev) and `TEAM_ROSTER__PRODUCTION` in Bitwarden, the
  same as a secret ([README.md#team-roster](../../README.md#team-roster)), and on a laptop as
  `db/seed/roster.local.json`, which git ignores.
- **`scripts/seed-roster.mjs` only adds:** players not yet in `members` (matched by name, any case), an email where
  there's none, roles where they're missing. It never changes or removes anyone, so `deploy.yml` runs it on every
  deploy after the database rebuild, and what admins do in the app always wins. It bumps `data_version` so open apps
  reload ([ADR 0053](0053-live-reads-are-cached.md)). It refuses a roster that lists a name twice.
- Anything else personal that ever needs seeding follows the same path.

**Enquiries are deleted 12 months after they're sent**, unless the person joined (`status = 'joined'`). The privacy
page says so.

- The website's Worker deletes them itself, on a daily cron (03:17 UTC, `apps/web/wrangler.jsonc` triggers):
  `expireEnquiries` in `apps/web/src/lib/server/enquiries.ts`, called from `apps/web/src/worker.ts`, which is Astro's
  handler plus the cron. It runs whether or not anything deploys. A test drives the same function.
- The copies in the club's Gmail (enquiry emails and auto-replies) are deleted by hand once a month: the website's
  Gmail access can only send. The steps are in docs/editing.md.

**A member can delete their account, and download their data** (#30), in the team app: Profile → Your data. An
admin does the same for a member who asks by email (their member sheet → Delete their account).

- Deleting erases, now: the member's row stays, so the club's records still add up (payments, who played a session,
  goals), but becomes a nameless **Former member** (`status = 'erased'`): no email, phone, bio, photo, bank reference
  or roles. Their sessions and sign-in codes go, so they're signed out everywhere; places for what's still to come are
  given up; earlier audit entries stop naming them (`apps/team/worker/members/members.erase.ts`). The audit log records
  the deletion as a change of standing only. The club's last admin can't delete their account.
- The download is everything the app holds about them as JSON, except their skill rating, which is the organisers'
  opinion and hidden from members; the privacy page says to ask for it.
- **Sign-in records are kept no longer than needed**, by the team app's hourly cron (`settings/retention.ts`): sign-in
  codes 30 days, a session 30 days after it ended, audit entries 2 years.
- Backups keep a deleted account for up to 90 days ([ADR 0106](0106-database-backups.md)); the privacy page says so.
- The privacy page covers the team app: what it holds, who sees it, how long, and how to delete it.

## Consequences

- Names, ratings and emails never appear in the repo, its history, or CI logs (the value is masked). Production gets
  the roster the same way dev does, with nothing run by hand.
- The roster in Secrets Manager drifts from D1 once admins edit members in the app. That's fine: it's only the
  starting list, and re-seeding never overwrites. Renaming someone in the app and then re-seeding would add their old
  name back as a new member; edit the roster too if that happens while the roster still matters.
- Two copies to keep in step while the roster matters: the local file and Secrets Manager (both names). Seeding by
  name assumes no two players share a name.
- One cron trigger on the website's Worker (free; the free plan allows 5 per account). It belongs to the website, not
  the team app, so it runs before the team app is in production.
- Nothing sets `joined` yet, so every enquiry goes after 12 months; the team app will mark joiners when it turns
  enquiries into members.
- Changing the retention period means changing `KEEP_ENQUIRIES_MONTHS`, the privacy page and this record together;
  the same for the team app's (`retention.ts`).
- The roster seed adds players by name, so someone who deleted their account comes back on the next deploy if they're
  still in `TEAM_ROSTER`: take them off it (both names) too.

## History

- 2026-10-06: Enquiries deleted after 12 months by a SQL file run on every deploy; Gmail copies by hand (was 0029).
- 2026-10-06: Personal data kept out of the repo; the roster seeded from Secrets Manager by an add-only script; only
  non-personal data in migrations (was 0033).
- 2026-10-07: Migrations replaced by schema plus seed until launch, so the non-personal seed is `db/seed/club.sql` and
  the scripts run after the rebuild ([ADR 0050](0050-schema-and-seed-until-launch.md)).
- 2026-10-09: Enquiries deleted by a daily cron on the website's Worker, not a SQL file run on deploys: deploys are per
  app and only on change now (ADR 0010), so they're no clock.
- 2026-10-10: Members can delete their account (erased in place, as a Former member) and download their data; sign-in
  codes, ended sessions and audit entries are forgotten after 30 days, 30 days and 2 years; the privacy page covers
  the team app (#30).
