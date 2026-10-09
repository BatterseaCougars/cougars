# Architecture decision records

Short records of decisions that shape the project: what we decided, why, and what it costs us. Read the
relevant ones before changing how something works. If you change a decision, don't edit the old record:
add a new one that supersedes it, and mark the old one **Superseded by [NNNN](...)**.

Write one for anything someone would otherwise ask "why is it like this?" about: a service, a pattern, a
rule, a trade-off. Copy [template.md](template.md), take the next number, keep it to a page.

| #                                                          | Decision                                                                                       | Status                    |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| [0001](0001-record-decisions.md)                           | Record architecture decisions here                                                             | Accepted                  |
| [0002](0002-secrets-in-bitwarden.md)                       | Secrets live in Bitwarden; `.env` is local overrides only                                      | Accepted                  |
| [0003](0003-free-tiers-only.md)                            | Free tiers only                                                                                | Amended by 0096           |
| [0004](0004-astro-workers-sanity-d1.md)                    | Astro on Cloudflare Workers, content in Sanity, data in D1                                     | Amended by 0018           |
| [0005](0005-deploys.md)                                    | Production deploys only from `main`; design previews on their own worker                       | Superseded by 0010        |
| [0006](0006-monorepo-and-team-generator.md)                | One monorepo; the team generator runs in the browser                                           | Amended by 0021           |
| [0007](0007-bank-transfer-payments.md)                     | Payments by bank transfer with a reference, no card provider                                   | Amended by 0026           |
| [0008](0008-magic-link-admin-login.md)                     | Admin login by email magic link                                                                | Superseded by 0023        |
| [0009](0009-site-design-direction.md)                      | Site design: a Friday night, on carbon, one-page navigation                                    | Accepted                  |
| [0010](0010-two-environments.md)                           | Two environments, production and dev, on two Cloudflare accounts                               | Amended by 0013, 0017     |
| [0011](0011-no-news.md)                                    | No news section                                                                                | Accepted                  |
| [0012](0012-secrets-manager-projects.md)                   | Two Secrets Manager projects, shared by every app                                              | Accepted                  |
| [0013](0013-main-deploys-dev.md)                           | `main` deploys dev; `release` deploys production                                               | Amended by 0018           |
| [0014](0014-sanity-public-content.md)                      | Sanity is the source for public content; only club facts are editable                          | Amended by 0017, 0025     |
| [0015](0015-youtube-channel-pull.md)                       | Videos come from the club YouTube channel, with Sanity as overrides                            | Superseded by 0019        |
| [0016](0016-live-photo-gallery.md)                         | Photos are read live from Sanity, not at build time                                            | Accepted                  |
| [0017](0017-two-sanity-projects.md)                        | Two Sanity projects, one per environment                                                       | Accepted                  |
| [0018](0018-rebuilds-until-team-app.md)                    | Studio changes go live at the daily rebuild until the team app triggers builds                 | Amended by 0019           |
| [0019](0019-live-videos.md)                                | Videos are read live from YouTube and Sanity, cached                                           | Accepted                  |
| [0020](0020-drawn-share-cards.md)                          | Share pictures are drawn at build time                                                         | Accepted                  |
| [0021](0021-website-and-team-app-projects.md)              | Website and team app are separate projects in one repo                                         | Accepted                  |
| [0022](0022-team-app-svelte-pwa.md)                        | The team app is a mobile-first Svelte 5 SPA on a Worker, as a PWA                              | Accepted                  |
| [0023](0023-device-bound-sign-in.md)                       | Everyone signs in with a device-bound email code or link, or Google                            | Amended by 0035           |
| [0024](0024-action-based-authorization.md)                 | Permissions are actions; roles are data built from actions                                     | Extended by 0036          |
| [0025](0025-events-in-d1.md)                               | Events live in D1, one club calendar                                                           | Superseded by 0030        |
| [0026](0026-dues-ledger.md)                                | Dues are a ledger fed by the register                                                          | Amended by 0032, 0034     |
| [0027](0027-email-through-gmail-api.md)                    | Email goes through the Gmail API, and only production reaches real people                      | Accepted                  |
| [0028](0028-turnstile-and-auto-reply.md)                   | Auto-replies only to people Turnstile verified, and capped                                     | Accepted                  |
| [0029](0029-view-as-a-member.md)                           | Admins can view the app as a member, read-only                                                 | Accepted                  |
| [0029](0029-enquiry-retention.md)                          | Enquiries are deleted after 12 months                                                          | Accepted                  |
| [0030](0030-training-series-and-tournaments.md)            | Training repeats as a series; tournaments are typed and scheduled one by one                   | Accepted                  |
| [0031](0031-use-case-tests.md)                             | Tests describe what people do, against a fake world                                            | Accepted                  |
| [0032](0032-fees-per-session-and-tournament.md)            | Fees belong to each session and tournament; payments are marked against them                   | Amended by 0034           |
| [0033](0033-personal-data-out-of-the-repo.md)              | Personal data stays out of the repo; the roster is seeded from Secrets Manager                 | Accepted                  |
| [0034](0034-quarterly-members-and-the-cougars.md)          | Quarterly membership is a subscription; the Cougars are a flag on the member                   | Accepted                  |
| [0035](0035-sessions-are-hashed-tokens.md)                 | Sessions are hashed random tokens; sign-in is a code with no link                              | Accepted                  |
| [0036](0036-api-security.md)                               | Every API response sends only what that caller may see, decided on the server                  | Accepted                  |
| [0037](0037-everyday-role.md)                              | People with more than Member can run the app day to day as a lesser role                       | Accepted                  |
| [0038](0038-name-payment-references.md)                    | A member's bank reference is their name: COUGARS ADRIAN K                                      | Accepted                  |
| [0039](0039-videos-uploaded-on-youtube.md)                 | Videos are uploaded on YouTube with people's own access, not through the app                   | Accepted                  |
| [0040](0040-labelled-video-playlists.md)                   | Videos come from several club playlists, each labelled                                         | Accepted                  |
| [0041](0041-caches-in-production-only.md)                  | Live reads are cached in production only                                                       | Superseded by 0054        |
| [0042](0042-whats-on-from-the-club-calendar.md)            | The home page's What's on reads the club calendar live                                         | Accepted                  |
| [0043](0043-roster-from-the-club.md)                       | The website's roster is a build-time snapshot of the club's members, refreshed per card        | Accepted                  |
| [0044](0044-tournament-awards-in-the-app.md)               | Tournament awards are set in the team app                                                      | Accepted                  |
| [0045](0045-events-page-reads-the-club-calendar.md)        | The events page reads the club calendar live                                                   | Accepted                  |
| [0046](0046-tournament-date-details.md)                    | A tournament date has its own details: location, sign-up deadline, draft night, captains       | Accepted                  |
| [0047](0047-team-app-dev-server-bundles-up-front.md)       | The team app's dev server bundles every library up front; one per checkout                     | Accepted                  |
| [0048](0048-tournament-date-as-a-season.md)                | A tournament date can be just a season, "Summer 2027"                                          | Accepted                  |
| [0049](0049-tournaments-own-their-rules.md)                | A tournament owns its rules; its series is optional                                            | Accepted                  |
| [0050](0050-schema-and-seed-until-launch.md)               | Until launch, the database is a schema and a seed, not migrations                              | Accepted                  |
| [0051](0051-venues-and-map-links.md)                       | Venues are saved and picked; a one-off pastes its map link                                     | Accepted                  |
| [0052](0052-tournament-types-and-teams.md)                 | A tournament is teams entering or captains drafting; every tournament has teams                | Accepted                  |
| [0053](0053-sanity-reads-through-its-cdn.md)               | Every Sanity read goes through its API CDN                                                     | Amended by 0054           |
| [0054](0054-live-reads-are-cached-everywhere.md)           | Live reads are cached everywhere, on the server                                                | Amended by 0057           |
| [0055](0055-circuit-breakers.md)                           | Outside services are behind circuit breakers                                                   | Accepted                  |
| [0056](0056-rate-limits-on-every-api.md)                   | Every live route and API is rate limited                                                       | Accepted                  |
| [0057](0057-changes-reply-with-what-they-touched.md)       | A change replies with the parts of the club it touched                                         | Accepted                  |
| [0058](0058-degrade-instead-of-break.md)                   | Degrade instead of break: the app's own brake, and local fallback content                      | Amended by 0096           |
| [0059](0059-usage-page-and-check.md)                       | Admins see the free Cloudflare allowance, and are warned at 80%                                | Accepted                  |
| [0060](0060-draft-lifecycle.md)                            | A captains' draft is opened and closed by an admin                                             | Accepted                  |
| [0061](0061-fixtures-and-playoffs.md)                      | The app makes a tournament's fixtures: a round robin, then its playoffs                        | Accepted                  |
| [0062](0062-the-club-agenda.md)                            | One agenda that every part of the club pushes to                                               | Accepted                  |
| [0063](0063-cpu-time-on-the-usage-page.md)                 | The Usage page shows CPU time per request; a stopped request is an email                       | Accepted                  |
| [0064](0064-reset-a-draft.md)                              | An admin can reset a draft, until a game has a result                                          | Accepted                  |
| [0065](0065-admin-actions-where-the-thing-is.md)           | Admin actions live where the thing is, not under Settings                                      | Accepted                  |
| [0066](0066-draft-and-fixtures-are-independent.md)         | The draft and the fixtures are independent; a closed draft can reopen                          | Accepted                  |
| [0067](0067-one-goalie-a-team.md)                          | One goalie a team in a draft                                                                   | Accepted                  |
| [0068](0068-draft-page-is-for-picking.md)                  | The draft page is for picking: End turn sends a pick, teams are edited on their own page       | Accepted                  |
| [0069](0069-admins-add-members.md)                         | An admin adds a member, and the app emails them a link to itself                               | Accepted                  |
| [0070](0070-the-draft-is-for-its-captains.md)              | The draft is for its captains: members see the teams once it's closed, in no particular order  | Accepted                  |
| [0071](0071-scoring-games-live.md)                         | Scoring a game as it's played: one person holds the scoresheet                                 | Accepted                  |
| [0072](0072-live-update-pace-is-a-setting.md)              | How often live pages check for updates is the admins' setting                                  | Amended by 0096           |
| [0073](0073-champions-and-award-winners.md)                | The champions and the awards come from the results; an admin confirms them                     | Accepted                  |
| [0074](0074-tournament-home-in-three-acts.md)              | A tournament's home in three acts, its state from its games                                    | Accepted                  |
| [0075](0075-team-app-deploys-to-dev.md)                    | The team app deploys to dev from main                                                          | Accepted                  |
| [0076](0076-team-maker-role.md)                            | Team maker: a role for making training teams, by dragging                                      | Drafts superseded by 0079 |
| [0077](0077-dev-tools-and-who-gets-email-on-dev.md)        | Dev tools, and who gets their own email outside production                                     | Accepted                  |
| [0078](0078-one-page-frame.md)                             | One page frame: every title in the same place, editors in the page's column                    | Accepted                  |
| [0079](0079-training-teams-save-as-you-change-them.md)     | Training teams save as you change them; no drafts or Publish                                   | Accepted                  |
| [0080](0080-members-table-in-settings.md)                  | The members table is a Settings page that fills the window                                     | Accepted                  |
| [0081](0081-team-app-pages-load-when-opened.md)            | Team app pages load when opened, the rest in the background                                    | Accepted                  |
| [0082](0082-member-details-save-with-a-button.md)          | A member's details save with a Save button                                                     | Accepted                  |
| [0083](0083-main-button-is-vcr-blue.md)                    | The main button is VCR blue                                                                    | Superseded by 0084        |
| [0084](0084-sticker-colour-scheme.md)                      | The Sticker colour scheme: carbon, bone, cougar red, sticker yellow                            | Accepted                  |
| [0085](0085-one-name-everywhere.md)                        | Members go by their chosen name everywhere                                                     | Accepted                  |
| [0086](0086-next-tournament-without-last-time.md)          | The next tournament's page says less, and leaves the last one to History                       | Accepted                  |
| [0087](0087-next-tournament-in-three-questions.md)         | The next tournament is scheduled in three questions                                            | Accepted                  |
| [0088](0088-admins-delete-a-tournament.md)                 | An admin deletes a tournament, with everything that's its                                      | Accepted                  |
| [0089](0089-sign-up-opens-on-a-day.md)                     | A tournament's sign-up opens on a day                                                          | Accepted                  |
| [0090](0090-a-game-has-a-matchup-page-and-a-clock.md)      | A game has a matchup page, and its clock is its own                                            | Accepted                  |
| [0091](0091-a-series-has-usual-hours.md)                   | A tournament series has usual hours                                                            | Accepted                  |
| [0092](0092-security-headers-from-the-asset-layer-too.md)  | Security headers come from the asset layer too, and the team app has a content security policy | Accepted                  |
| [0093](0093-local-only-switches-need-a-private-address.md) | The local-only switches work only on a private address                                         | Accepted                  |
| [0094](0094-one-member-a-browser-at-a-time.md)             | A browser holds sign-in codes for one member at a time                                         | Accepted                  |
| [0095](0095-the-audit-log-has-a-page.md)                   | The audit log has a page, and says things in plain words                                       | Accepted                  |
| [0096](0096-live-pages-are-pushed-over-sse.md)             | Live pages are pushed to over SSE from a Durable Object; polling is the fallback               | Accepted                  |
| [0098](0098-changes-declare-their-record.md)               | A change declares what it puts on the record, on its route                                     | Accepted                  |
| [0099](0099-bootstrap-sends-only-your-own.md)              | Of anything personal, the bootstrap sends a member only their own                              | Accepted                  |
