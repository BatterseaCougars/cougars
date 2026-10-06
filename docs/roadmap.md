# Roadmap

The club runs two projects in this repo ([ADR 0021](adr/0021-website-and-team-app-projects.md)), on one D1
database, both on Cloudflare's free tier:

| Project      | What                                                                                       | Roadmap                                    |
| ------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------ |
| **Website**  | The public site and the Sanity Studio (`apps/web`, `apps/studio`; `website/` from T0)      | [roadmap/website.md](roadmap/website.md)   |
| **Team app** | Mobile-first app for members: calendar, sign-up, teams, dues, Kumite, uploads (`team/app`) | [roadmap/team-app.md](roadmap/team-app.md) |

Website milestones are numbered M0–M5, team-app milestones T0–T9. Each lands on `main` when it passes the pre-push
checks. `main` deploys dev; `release` deploys production ([ADR 0013](adr/0013-main-deploys-dev.md)).

## Free-tier budget

| Service                   | Free allowance                                                | Expected use                                       |
| ------------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| Cloudflare Workers        | 100k dynamic requests a day; static assets free and unlimited | Form posts, photo pages, team-app API, live Kumite |
| D1                        | 5 GB storage, 5M rows read a day                              | Tiny                                               |
| Cron Triggers             | Free                                                          | Friday series, quarterly dues                      |
| Sanity                    | Free plan: 1M CDN, 250k API requests a month; see below       | A handful of editors; live photo reads             |
| Bitwarden Secrets Manager | Free plan, 3 machine accounts                                 | 1                                                  |
| GitHub Actions            | 2,000 minutes a month (private repo)                          | About 2 minutes per deploy, per project            |
| YouTube Data API          | 10,000 units a day per Google Cloud project                   | Video reads; an upload costs about 1,600 units     |
| Gmail API                 | Free, about 500 emails a day                                  | Sign-in codes, enquiries, dues reminders           |
| Web Push                  | Free (browser push services)                                  | Team-app notifications (T9)                        |

Sanity Free, checked on [sanity.io/pricing](https://www.sanity.io/pricing) on 2026-10-05: 20 seats, 2 datasets
(public only), 10k documents, 1M API CDN requests and 250k API requests a month, 100 GB of assets, 100 GB of
bandwidth a month. Photo pages read the API CDN live ([ADR 0016](adr/0016-live-photo-gallery.md)).

YouTube uploads from an unverified Google Cloud project are locked to private until the project passes Google's
API compliance audit (free). The team app applies for it in T0.

The only planned cost is a domain, at about £10 a year. Publishing the team app to the app stores would add
Apple's developer fee (about $99 a year) and Google's ($25 once); that needs a decision under
[ADR 0003](adr/0003-free-tiers-only.md) before T9.
