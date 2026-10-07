# Architecture decision records

Short records of decisions that shape the project: what we decided, why, and what it costs us. Read the
relevant ones before changing how something works. If you change a decision, don't edit the old record:
add a new one that supersedes it, and mark the old one **Superseded by [NNNN](...)**.

Write one for anything someone would otherwise ask "why is it like this?" about: a service, a pattern, a
rule, a trade-off. Copy [template.md](template.md), take the next number, keep it to a page.

| #                                             | Decision                                                                       | Status                |
| --------------------------------------------- | ------------------------------------------------------------------------------ | --------------------- |
| [0001](0001-record-decisions.md)              | Record architecture decisions here                                             | Accepted              |
| [0002](0002-secrets-in-bitwarden.md)          | Secrets live in Bitwarden; `.env` is local overrides only                      | Accepted              |
| [0003](0003-free-tiers-only.md)               | Free tiers only                                                                | Accepted              |
| [0004](0004-astro-workers-sanity-d1.md)       | Astro on Cloudflare Workers, content in Sanity, data in D1                     | Amended by 0018       |
| [0005](0005-deploys.md)                       | Production deploys only from `main`; design previews on their own worker       | Superseded by 0010    |
| [0006](0006-monorepo-and-team-generator.md)   | One monorepo; the team generator runs in the browser                           | Amended by 0021       |
| [0007](0007-bank-transfer-payments.md)        | Payments by bank transfer with a reference, no card provider                   | Amended by 0026       |
| [0008](0008-magic-link-admin-login.md)        | Admin login by email magic link                                                | Superseded by 0023    |
| [0009](0009-site-design-direction.md)         | Site design: a Friday night, on carbon, one-page navigation                    | Accepted              |
| [0010](0010-two-environments.md)              | Two environments, production and dev, on two Cloudflare accounts               | Amended by 0013, 0017 |
| [0011](0011-no-news.md)                       | No news section                                                                | Accepted              |
| [0012](0012-secrets-manager-projects.md)      | Two Secrets Manager projects, shared by every app                              | Accepted              |
| [0013](0013-main-deploys-dev.md)              | `main` deploys dev; `release` deploys production                               | Amended by 0018       |
| [0014](0014-sanity-public-content.md)         | Sanity is the source for public content; only club facts are editable          | Amended by 0017, 0025 |
| [0015](0015-youtube-channel-pull.md)          | Videos come from the club YouTube channel, with Sanity as overrides            | Superseded by 0019    |
| [0016](0016-live-photo-gallery.md)            | Photos are read live from Sanity, not at build time                            | Accepted              |
| [0017](0017-two-sanity-projects.md)           | Two Sanity projects, one per environment                                       | Accepted              |
| [0018](0018-rebuilds-until-team-app.md)       | Studio changes go live at the daily rebuild until the team app triggers builds | Amended by 0019       |
| [0019](0019-live-videos.md)                   | Videos are read live from YouTube and Sanity, cached                           | Accepted              |
| [0020](0020-drawn-share-cards.md)             | Share pictures are drawn at build time                                         | Accepted              |
| [0021](0021-website-and-team-app-projects.md) | Website and team app are separate projects in one repo                         | Accepted              |
| [0022](0022-team-app-svelte-pwa.md)           | The team app is a mobile-first Svelte 5 SPA on a Worker, as a PWA              | Accepted              |
| [0023](0023-device-bound-sign-in.md)          | Everyone signs in with a device-bound email code or link, or Google            | Accepted              |
| [0024](0024-action-based-authorization.md)    | Permissions are actions; roles are data built from actions                     | Accepted              |
| [0025](0025-events-in-d1.md)                  | Events live in D1, one club calendar                                           | Accepted              |
| [0026](0026-dues-ledger.md)                   | Dues are a ledger fed by the register                                          | Accepted              |
| [0027](0027-email-through-gmail-api.md)       | Email goes through the Gmail API, and only production reaches real people      | Accepted              |
| [0028](0028-turnstile-and-auto-reply.md)      | Auto-replies only to people Turnstile verified, and capped                     | Accepted              |
| [0029](0029-enquiry-retention.md)             | Enquiries are deleted after 12 months                                          | Accepted              |
| [0040](0040-labelled-video-playlists.md)      | Videos come from several club playlists, each labelled                         | Accepted              |
| [0041](0041-caches-in-production-only.md)     | Live reads are cached in production only                                       | Accepted              |
