# Architecture decision records

Short records of decisions that shape the project: what we decided, why, and what it costs us. Read the
relevant ones before changing how something works. If you change a decision, don't edit the old record:
add a new one that supersedes it, and mark the old one **Superseded by [NNNN](...)**.

Write one for anything someone would otherwise ask "why is it like this?" about: a service, a pattern, a
rule, a trade-off. Copy [template.md](template.md), take the next number, keep it to a page.

| #                                           | Decision                                                                 | Status             |
| ------------------------------------------- | ------------------------------------------------------------------------ | ------------------ |
| [0001](0001-record-decisions.md)            | Record architecture decisions here                                       | Accepted           |
| [0002](0002-secrets-in-bitwarden.md)        | Secrets live in Bitwarden; `.env` is local overrides only                | Accepted           |
| [0003](0003-free-tiers-only.md)             | Free tiers only                                                          | Accepted           |
| [0004](0004-astro-workers-sanity-d1.md)     | Astro on Cloudflare Workers, content in Sanity, data in D1               | Accepted           |
| [0005](0005-deploys.md)                     | Production deploys only from `main`; design previews on their own worker | Superseded by 0010 |
| [0006](0006-monorepo-and-team-generator.md) | One monorepo; the team generator runs in the browser                     | Accepted           |
| [0007](0007-bank-transfer-payments.md)      | Payments by bank transfer with a reference, no card provider             | Accepted           |
| [0008](0008-magic-link-admin-login.md)      | Admin login by email magic link                                          | Accepted           |
| [0009](0009-site-design-direction.md)       | Site design: a Friday night, on carbon, one-page navigation              | Accepted           |
| [0010](0010-two-environments.md)            | Two environments, production and dev, on two Cloudflare accounts         | Amended by 0013    |
| [0011](0011-no-news.md)                     | No news section                                                          | Accepted           |
| [0012](0012-secrets-manager-projects.md)    | Two Secrets Manager projects, shared by every app                        | Accepted           |
| [0013](0013-main-deploys-dev.md)            | `main` deploys dev; `release` deploys production                         | Accepted           |
| [0014](0014-sanity-public-content.md)       | Sanity is the source for public content; only club facts are editable    | Accepted           |
| [0015](0015-youtube-channel-pull.md)        | Videos come from the club YouTube channel, with Sanity as overrides      | Accepted           |
| [0016](0016-live-photo-gallery.md)          | Photos are read live from Sanity, not at build time                      | Accepted           |
