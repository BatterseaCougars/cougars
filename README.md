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

To preview the design with sample events, videos, photos and players: `DEMO_CONTENT=true npm run dev`.

The site builds and runs **without Sanity**: until a Sanity project is configured, it uses the club copy in
`apps/web/src/lib/sanity/fallback.ts` and shows empty states for videos, photos and events.

With secrets (needs `BWS_ACCESS_TOKEN`, see [Secrets](#secrets)):

```sh
node scripts/env-pull.mjs --status          # list secret names (never values)
node scripts/env-pull.mjs -- npm run dev    # run with dev secrets injected
```

## Secrets

Rules ([ADR 0002](docs/adr/0002-secrets-in-bitwarden.md), [ADR 0010](docs/adr/0010-two-environments.md)):

- Every secret lives in **Bitwarden Secrets Manager** and nowhere else. GitHub holds only `BWS_ACCESS_TOKEN`
  (one per GitHub environment). There are no secret files; `.env` is for local, non-secret overrides
  ([.env.example](.env.example)).
- **Two environments.** Production (Cloudflare account **Cougars**) and dev (account **Cougars Dev**). Your
  machine, PR previews and `scripts/deploy-dev.sh` are dev.
- **Naming:** `NAME` applies to both; `NAME__PRODUCTION` / `NAME__DEV` override it for one. Code reads `NAME`.
  Production values sit in the Secrets Manager project `cougars`; dev and shared values in `cougars-dev`.
- **A token is named exactly like its secret** at the provider that issued it.
- **Every secret has an entry below.** Adding one: create the token with its secret name, add it to Secrets
  Manager, add it here.

| Secret                                                                                | Project       | Issued by                  | Used by                           |
| ------------------------------------------------------------------------------------- | ------------- | -------------------------- | --------------------------------- |
| [`BWS_ACCESS_TOKEN`](#bws_access_token)                                               | (GitHub)      | Bitwarden machine accounts | CI, your shell                    |
| [`CLOUDFLARE_API_TOKEN__PRODUCTION`](#cloudflare_api_token__production)               | `cougars`     | Cloudflare, Cougars        | Production deploys                |
| [`CLOUDFLARE_ACCOUNT_ID__PRODUCTION`](#cloudflare_account_id__production)             | `cougars`     | Cloudflare, Cougars        | Production deploys                |
| [`CLOUDFLARE_API_TOKEN__DEV`](#cloudflare_api_token__dev)                             | `cougars-dev` | Cloudflare, Cougars Dev    | PR previews, `deploy-dev.sh`      |
| [`CLOUDFLARE_ACCOUNT_ID__DEV`](#cloudflare_account_id__dev)                           | `cougars-dev` | Cloudflare, Cougars Dev    | PR previews, `deploy-dev.sh`      |
| [`SANITY_PROJECT_ID`](#sanity_project_id)                                             | `cougars-dev` | Sanity                     | Website build (both)              |
| [`SANITY_API_TOKEN`](#sanity_api_token)                                               | `cougars-dev` | Sanity                     | Website build (both)              |
| [`SANITY_DATASET__DEV`](#sanity_dataset__dev)                                         | `cougars-dev` | (a setting)                | Dev builds read the `dev` dataset |
| [`SANITY_WEBHOOK_GITHUB_TOKEN__PRODUCTION`](#sanity_webhook_github_token__production) | `cougars`     | GitHub (fine-grained)      | Sanity's publish webhook          |

### `BWS_ACCESS_TOKEN`

Lets CI (and you) read the other secrets. Each is an access token on a Bitwarden machine account, named
`BWS_ACCESS_TOKEN`:

| Machine account  | Reads                                        | Stored in                                        |
| ---------------- | -------------------------------------------- | ------------------------------------------------ |
| `cougars-ci`     | `cougars`, `cougars-dev`                     | GitHub environment `production` (deploys `main`) |
| `cougars-ci-dev` | `cougars-dev` only                           | GitHub environment `preview` (pull requests)     |
| your own         | `cougars-dev` (and `cougars` if you need it) | your shell, exported for the session             |

- **Gets there by:** `deploy.yml` runs `scripts/env-pull.mjs --github-env --environment production|dev`, which
  exports the rest (masked). Locally, `node scripts/env-pull.mjs -- <command>` (dev by default).
- **Expires:** as set when created. Check each machine account's token list.
- **Rotate:** new token on the machine account, `gh secret set BWS_ACCESS_TOKEN --env <environment>`, run a
  deploy, revoke the old token.

### `CLOUDFLARE_API_TOKEN__PRODUCTION`

Deploys the `cougars` worker and migrates the `cougars` D1 database on the **Cougars** account.

- **Issued by:** Cloudflare, Cougars account → Manage Account → **Account API Tokens**. Scope **Entire
  Cougars account**; permissions **Workers Admin** (Editor can't create a new worker), **D1 Write**. Token name:
  `CLOUDFLARE_API_TOKEN__PRODUCTION`.
- **Used by:** `deploy.yml` on `main` and Studio publishes only (`target.mjs`, migrations, `wrangler deploy`).
- **Gets there by:** CI pull from Secrets Manager (code reads `CLOUDFLARE_API_TOKEN`).
- **Expires:** no, unless you set a TTL.
- **Rotate:** roll it in the dashboard, update Secrets Manager.

### `CLOUDFLARE_ACCOUNT_ID__PRODUCTION`

The Cougars account's id (account home page). Not secret. Account tokens need it.

### `CLOUDFLARE_API_TOKEN__DEV`

Deploys the `cougars-dev` worker and migrates the `cougars-dev` D1 database on the **Cougars Dev** account.
Can't touch production: it is a different account.

- **Issued by:** Cloudflare, Cougars Dev account → Manage Account → **Account API Tokens**. Scope **Entire
  Cougars Dev account**; permissions **Workers Admin** (Editor can't create a new worker), **D1 Write**. Token name: `CLOUDFLARE_API_TOKEN__DEV`.
- **Used by:** `deploy.yml` on pull requests (preview versions), `scripts/deploy-dev.sh`.
- **Gets there by:** CI pull, or `node scripts/env-pull.mjs -- bash scripts/deploy-dev.sh`.
- **Expires:** no, unless you set a TTL.
- **Rotate:** roll it in the dashboard, update Secrets Manager.

### `CLOUDFLARE_ACCOUNT_ID__DEV`

The Cougars Dev account's id. Not secret.

### `SANITY_PROJECT_ID`

Which Sanity project the website reads. Shared by both environments (they use different datasets). Not
secret. Without it, the site builds from `apps/web/src/lib/sanity/fallback.ts`.

### `SANITY_API_TOKEN`

Lets the website build read content. One token reads both datasets.

- **Issued by:** Sanity → API → Tokens, role **Viewer**. Token name: `SANITY_API_TOKEN`.
- **Used by:** the website build (`apps/web/src/lib/sanity/client.ts`). Never sent to the browser.
- **Expires:** no.
- **Rotate:** add a new Viewer token with the same name, update Secrets Manager, deploy, delete the old one.

### `SANITY_DATASET__DEV`

`dev`. Makes dev builds read the `dev` dataset; production uses the default, `production`. A setting, kept here
so the naming rule picks it per environment.

### `SANITY_WEBHOOK_GITHUB_TOKEN__PRODUCTION`

Lets Sanity start a production rebuild when an editor presses Publish (`repository_dispatch` → `deploy.yml`).

- **Issued by:** GitHub → Developer settings → Fine-grained tokens, repository `das974/cougars` only,
  **Contents: Read and write**. Token name: `SANITY_WEBHOOK_GITHUB_TOKEN__PRODUCTION`.
- **Stored in:** Secrets Manager (the record) and the Sanity webhook's `Authorization` header (where it is used).
  See [docs/setup.md](docs/setup.md#5-publish--rebuild-webhook).
- **Expires:** yes, at most a year. Set a reminder.
- **Rotate:** new token with the same name, update Secrets Manager and the webhook header, publish something to
  check, delete the old token.

### Settings that aren't secret

| Name                                    | Where                       | What                                                          |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| `SITE_URL`                              | GitHub variable             | Production URL, once there is a domain                        |
| `BWS_SERVER_URL`                        | GitHub variable, your shell | `https://vault.bitwarden.eu` if the vault is on the EU server |
| `SANITY_DATASET`                        | Default `production`        | Overridden by `SANITY_DATASET__DEV` for dev                   |
| `SANITY_STUDIO_PROJECT_ID` / `_DATASET` | Studio config defaults      | Which project and dataset the Studio edits                    |
| `DEMO_CONTENT`                          | `.env`, dev builds          | Sample content + `noindex`; never set for production          |
| `PUBLIC_BUILD_VERSION`                  | Set by CI                   | Shown in `<meta name="generator">`; checked by the smoke test |

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
