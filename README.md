# Battersea Cougars

Website (and, later, club operations) for the Battersea Cougars inline hockey club.

| Part                   | What                                                                      | Where                 |
| ---------------------- | ------------------------------------------------------------------------- | --------------------- |
| `apps/web`             | Public website: Astro, deployed as a Cloudflare Worker with static assets | http://localhost:4500 |
| `apps/studio`          | Sanity Studio, where the club edits content                               | http://localhost:4520 |
| `db/`                  | D1 (SQLite) migrations                                                    |                       |
| `shared/`              | Code used by more than one app (D1 helpers, test fixtures)                |                       |
| `scripts/`             | Secrets loading (Bitwarden) and CI helpers                                |                       |
| `archive/team-manager` | The old Next.js + Airtable team picker, kept as **reference only**        |                       |

Running cost is £0: every service is on a free tier (see [docs/roadmap.md](docs/roadmap.md)).

## Quick start

```sh
npm ci
npm run db:migrate:local   # create the local D1 database
npm run dev                # http://localhost:4500
npm test
```

To preview the design with sample events and news (dev server only): `DEMO_CONTENT=true npm run dev`.

The site builds and runs **without Sanity**: until a Sanity project is configured, it uses the club copy in
`apps/web/src/lib/sanity/fallback.ts` and shows empty states for news/videos/events/gallery.

With secrets (needs `BWS_ACCESS_TOKEN`, see [Secrets](#secrets)):

```sh
node scripts/env-pull.mjs --status          # list secret names (never values)
node scripts/env-pull.mjs -- npm run dev    # run with secrets injected
```

## Secrets

Rules ([ADR 0002](docs/adr/0002-secrets-in-bitwarden.md)):

- Every secret lives in **Bitwarden Secrets Manager**, project `cougars`, and nowhere else. GitHub holds only
  `BWS_ACCESS_TOKEN`. There are no secret files.
- **Naming:** `NAME` applies everywhere; `NAME__PRODUCTION`, `NAME__PREVIEW` (pull-request previews) or
  `NAME__DESIGN` (design previews) override it for that environment. Code reads `NAME`.
- **A token is named exactly like its secret** at the provider that issued it, so each provider's token list
  matches this table.
- **`.env` (repo root) is for local, non-secret overrides only.** See [.env.example](.env.example).
- **Every secret has an entry below.** Adding one means: create the token with its secret name, add it to
  Secrets Manager, add it here.

| Secret                                                            | Issued by                     | Used by                     |
| ----------------------------------------------------------------- | ----------------------------- | --------------------------- |
| [`BWS_ACCESS_TOKEN`](#bws_access_token)                           | Bitwarden machine account     | CI, your shell              |
| [`CLOUDFLARE_API_TOKEN`](#cloudflare_api_token)                   | Cloudflare (club account)     | CI deploys, D1 migrations   |
| [`CLOUDFLARE_ACCOUNT_ID`](#cloudflare_account_id)                 | Cloudflare (club account)     | CI deploys                  |
| [`CLOUDFLARE_API_TOKEN__DESIGN`](#cloudflare_api_token__design)   | Cloudflare (personal account) | `scripts/deploy-preview.sh` |
| [`CLOUDFLARE_ACCOUNT_ID__DESIGN`](#cloudflare_account_id__design) | Cloudflare (personal account) | `scripts/deploy-preview.sh` |
| [`SANITY_PROJECT_ID`](#sanity_project_id)                         | Sanity                        | Website build               |
| [`SANITY_API_TOKEN`](#sanity_api_token)                           | Sanity                        | Website build               |
| [`SANITY_WEBHOOK_GITHUB_TOKEN`](#sanity_webhook_github_token)     | GitHub (fine-grained)         | Sanity's publish webhook    |

### `BWS_ACCESS_TOKEN`

Lets CI (and you, locally) read every other secret. Without it nothing builds with real content or deploys.

- **Issued by:** Bitwarden, as an access token on a machine account: `github-ci` (read on `cougars`) for CI;
  your own machine account for local use. Name the token `BWS_ACCESS_TOKEN` on both.
- **Stored in:** GitHub repository secret `BWS_ACCESS_TOKEN`. Locally: exported in your shell only.
- **Gets there by:** `deploy.yml` passes it to `scripts/env-pull.mjs --github-env`, which exports the rest
  (masked) into the job.
- **Expires:** as set when created. Check the machine account's token list.
- **Rotate:** create a new token on the machine account, `gh secret set BWS_ACCESS_TOKEN`, run a deploy,
  revoke the old token.

### `CLOUDFLARE_API_TOKEN`

Deploys the `cougars` worker and runs D1 migrations on the club's Cloudflare account.

- **Issued by:** Cloudflare, club account → My Profile → API Tokens, template "Edit Cloudflare Workers" plus
  **Account → D1 → Edit**, restricted to the club account. Token name: `CLOUDFLARE_API_TOKEN`.
- **Used by:** `deploy.yml` (`ensure-d1`, migrations, `wrangler deploy` / `versions upload`).
- **Gets there by:** CI pull from Secrets Manager.
- **Expires:** no, unless you set a TTL.
- **Rotate:** roll it in the Cloudflare dashboard, update the value in Secrets Manager. Nothing else holds it.

### `CLOUDFLARE_ACCOUNT_ID`

Which Cloudflare account to deploy to. Not secret, kept in Secrets Manager so CI has one source.

- **Issued by:** Cloudflare (Workers & Pages overview, right-hand side).
- **Used by:** `deploy.yml`, via Wrangler.

### `CLOUDFLARE_API_TOKEN__DESIGN`

Deploys **design previews** (`cougars-preview` worker, `cougars-preview` D1) to a personal Cloudflare
account, never the club's. See [ADR 0005](docs/adr/0005-deploys.md).

- **Issued by:** Cloudflare, personal account → Manage Account → **Account API Tokens**. Permissions:
  **Account → Workers Scripts → Edit**, **Account → D1 → Edit**. Token name: `CLOUDFLARE_API_TOKEN__DESIGN`.
- **Used by:** `scripts/deploy-preview.sh`, run by hand.
- **Gets there by:** `node scripts/env-pull.mjs --environment design -- bash scripts/deploy-preview.sh`
  (code reads `CLOUDFLARE_API_TOKEN`), or exported in your shell for one run.
- **Expires:** no, unless you set a TTL.
- **Rotate:** roll it in the dashboard, update Secrets Manager.

### `CLOUDFLARE_ACCOUNT_ID__DESIGN`

The personal account design previews go to. Not secret. Used by `scripts/deploy-preview.sh`.

### `SANITY_PROJECT_ID`

Which Sanity project the website reads content from. Not secret (it is also the Studio's default). Without it,
the site builds from `apps/web/src/lib/sanity/fallback.ts`.

- **Issued by:** Sanity (sanity.io/manage → project).
- **Used by:** the website build (`astro:env`).

### `SANITY_API_TOKEN`

Lets the website build read content from Sanity.

- **Issued by:** Sanity → API → Tokens, role **Viewer**. Token name: `SANITY_API_TOKEN`.
- **Used by:** the website build (`apps/web/src/lib/sanity/client.ts`). Never sent to the browser.
- **Gets there by:** CI pull from Secrets Manager.
- **Expires:** no.
- **Rotate:** add a new Viewer token with the same name, update Secrets Manager, run a deploy, delete the old
  token.

### `SANITY_WEBHOOK_GITHUB_TOKEN`

Lets Sanity start a rebuild when an editor presses Publish (`repository_dispatch` → `deploy.yml`).

- **Issued by:** GitHub → Developer settings → Fine-grained tokens, repository `das974/cougars` only,
  **Contents: Read and write**. Token name: `SANITY_WEBHOOK_GITHUB_TOKEN`.
- **Stored in:** Secrets Manager (the record), and pasted into the Sanity webhook's `Authorization` header
  (where it is used). See [docs/setup.md](docs/setup.md#5-publish--rebuild-webhook).
- **Expires:** yes, fine-grained tokens expire (at most a year). Set a reminder.
- **Rotate:** create a new token with the same name, update Secrets Manager and the webhook header, publish
  something to check, delete the old token.

### Settings that aren't secret

| Name                                    | Where                        | What                                                          |
| --------------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| `SITE_URL`                              | GitHub variable              | Public URL, once there is a domain                            |
| `BWS_SERVER_URL`                        | GitHub variable, your shell  | `https://vault.bitwarden.eu` if the vault is on the EU server |
| `BWS_PROJECT_ID`                        | GitHub variable, your shell  | Limits `bws` to the `cougars` project                         |
| `SANITY_DATASET`                        | Default `production`         | Sanity dataset the site reads                                 |
| `SANITY_STUDIO_PROJECT_ID` / `_DATASET` | Studio config defaults       | Which project the Studio edits                                |
| `DEMO_CONTENT`                          | `.env` or the preview script | Sample content for design previews; never set in CI           |
| `PUBLIC_BUILD_VERSION`                  | Set by CI                    | Shown in `<meta name="generator">`; checked by the smoke test |

## Docs

- [docs/setup.md](docs/setup.md): one-time account setup (Cloudflare, Sanity, Bitwarden, GitHub)
- [docs/editing.md](docs/editing.md): guide for club editors (no coding)
- [docs/roadmap.md](docs/roadmap.md): what's next (attendance, payments, Kumite)
- [docs/adr/](docs/adr/README.md): architecture decisions, and why
- [db/README.md](db/README.md): database conventions
- [CLAUDE.md](CLAUDE.md): conventions for contributors and AI agents

## Ports (devcontainer)

Cougars owns ports **4500-4529** so it doesn't clash with other projects on the host:
4500 web, 4510 ops app, 4520 Sanity Studio.

Opening the devcontainer installs dependencies, migrates the local D1 database and starts **web** and **ops**
automatically (VS Code tasks in `.vscode/tasks.json`, each in its own terminal). Start the Studio with
_Terminal → Run Task… → dev: studio_.
