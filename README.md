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

With secrets (run `bw-unlock` first, see [Bitwarden tokens](#bitwarden-tokens)):

```sh
node scripts/env-pull.mjs --status          # list secret names (never values)
node scripts/env-pull.mjs -- npm run dev    # run with dev secrets injected
```

## Secrets

Rules ([ADR 0002](docs/adr/0002-secrets-in-bitwarden.md), [ADR 0010](docs/adr/0010-two-environments.md)):

- Every secret lives in **Bitwarden Secrets Manager** and nowhere else. GitHub holds only the Bitwarden tokens
  (one per GitHub environment). There are no secret files; `.env` is for local, non-secret overrides
  ([.env.example](.env.example)).
- **Two environments.** Production (Cloudflare account **Cougars**) and dev (account **Cougars Dev**). Your
  machine, PR previews and `scripts/deploy-dev.sh` are dev.
- **Naming:** `NAME` applies to both; `NAME__PRODUCTION` / `NAME__DEV` override it for one. Code reads `NAME`.
  Production values sit in the Secrets Manager project `cougars`; dev and shared values in `cougars-dev`. Every
  app shares these two projects ([ADR 0012](docs/adr/0012-secrets-manager-projects.md)); _Used by_ says which app
  needs a secret.
- **A token is named exactly like its secret** at the provider that issued it.
- **Every secret has an entry below.** Adding one: create the token with its secret name, add it to Secrets
  Manager with `node scripts/secret-set.mjs NAME` (hidden prompt; it picks the project from the name), add it here.

| Secret                                                                                | Project       | Issued by                   | Used by                           |
| ------------------------------------------------------------------------------------- | ------------- | --------------------------- | --------------------------------- |
| [`BWS_ACCESS_TOKEN__PRODUCTION`](#bitwarden-tokens)                                   | (GitHub)      | Bitwarden, `cougars-ci`     | Production deploys                |
| [`BWS_ACCESS_TOKEN__DEV`](#bitwarden-tokens)                                          | (GitHub)      | Bitwarden, `cougars-ci-dev` | PR previews                       |
| [`COUGARS_LOCAL_BW_TOKEN`](#bitwarden-tokens)                                         | (your vault)  | Bitwarden, `cougars-local`  | Your machine                      |
| [`CLOUDFLARE_API_TOKEN__PRODUCTION`](#cloudflare_api_token__production)               | `cougars`     | Cloudflare, Cougars         | Production deploys                |
| [`CLOUDFLARE_ACCOUNT_ID__PRODUCTION`](#cloudflare_account_id__production)             | `cougars`     | Cloudflare, Cougars         | Production deploys                |
| [`CLOUDFLARE_API_TOKEN__DEV`](#cloudflare_api_token__dev)                             | `cougars-dev` | Cloudflare, Cougars Dev     | PR previews, `deploy-dev.sh`      |
| [`CLOUDFLARE_ACCOUNT_ID__DEV`](#cloudflare_account_id__dev)                           | `cougars-dev` | Cloudflare, Cougars Dev     | PR previews, `deploy-dev.sh`      |
| [`SANITY_PROJECT_ID`](#sanity_project_id)                                             | `cougars-dev` | Sanity                      | Website build (both)              |
| [`SANITY_API_TOKEN`](#sanity_api_token)                                               | `cougars-dev` | Sanity                      | Website build (both)              |
| [`SANITY_DATASET__DEV`](#sanity_dataset__dev)                                         | `cougars-dev` | (a setting)                 | Dev builds read the `dev` dataset |
| [`SANITY_WEBHOOK_GITHUB_TOKEN__PRODUCTION`](#sanity_webhook_github_token__production) | `cougars`     | GitHub (fine-grained)       | Sanity's publish webhook          |
| [`SANITY_DEPLOY_TOKEN__PRODUCTION`](#sanity_deploy_token__production)                 | `cougars`     | Sanity                      | Studio deploys                    |
| [`YOUTUBE_API_KEY__PRODUCTION`](#youtube-api-keys)                                    | `cougars`     | Google Cloud                | Website build (production)        |
| [`YOUTUBE_API_KEY__DEV`](#youtube-api-keys)                                           | `cougars-dev` | Google Cloud                | Website build (dev)               |

### Bitwarden tokens

They let CI (and you) read the other secrets. Each is the access token of one Bitwarden machine account, named
like the secret that holds it:

| Token                          | Machine account  | `cougars`       | `cougars-dev`   | Stored in                                           |
| ------------------------------ | ---------------- | --------------- | --------------- | --------------------------------------------------- |
| `BWS_ACCESS_TOKEN__PRODUCTION` | `cougars-ci`     | Can read        | Can read        | GitHub environment `production` (deploys `release`) |
| `BWS_ACCESS_TOKEN__DEV`        | `cougars-ci-dev` | No access       | Can read        | GitHub environment `preview` (`main` and PRs)       |
| `COUGARS_LOCAL_BW_TOKEN`       | `cougars-local`  | Can read, write | Can read, write | your vault: secure note `cougars/.env.local`        |

Project access is set in Secrets Manager → **Machine accounts → _account_ → Projects**. CI is read-only: it never
changes a secret. `cougars-local` can write, so you add secrets from the shell
(`node scripts/secret-set.mjs NAME`).
People (org members) get access to the projects they maintain; the free plan allows 2.

- **Gets there by:** `deploy.yml` passes its environment's token to `bws` as `BWS_ACCESS_TOKEN` and runs
  `scripts/env-pull.mjs --github-env --environment production|dev`, which exports the rest (masked). Locally,
  **`bw-unlock` is the login** (once per container start, as in Ark): the scripts read the token from the vault
  note `cougars/.env.local` (a line `COUGARS_LOCAL_BW_TOKEN=...`), and ask for your master password if it's locked: `node scripts/env-pull.mjs -- <command>`.
- **Expires:** as set when created. Check each machine account's token list.
- **Rotate:** new token on the machine account, `gh secret set <name> --env <environment>` (or update your vault),
  run a deploy, revoke the old token.

### `CLOUDFLARE_API_TOKEN__PRODUCTION`

Deploys the `cougars` worker and migrates the `cougars` D1 database on the **Cougars** account.

- **Issued by:** Cloudflare, Cougars account → Manage Account → **Account API Tokens**. Scope **Entire
  Cougars account**; permissions **Workers Admin** (Editor can't create a new worker), **D1 Write**. Token name:
  `CLOUDFLARE_API_TOKEN__PRODUCTION`.
- **Used by:** `deploy.yml` on `release` and Studio publishes only (`target.mjs`, migrations, `wrangler deploy`).
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
- **Used by:** `deploy.yml` on `main` and pull requests (preview versions), `scripts/deploy-dev.sh`.
- **Gets there by:** CI pull, or `node scripts/env-pull.mjs -- bash scripts/deploy-dev.sh`.
- **Expires:** no, unless you set a TTL.
- **Rotate:** roll it in the dashboard, update Secrets Manager.

### `CLOUDFLARE_ACCOUNT_ID__DEV`

The Cougars Dev account's id. Not secret.

### `SANITY_PROJECT_ID`

Which Sanity project the website reads. Shared by both environments (they use different datasets). Not
secret. Without it, the site builds from `apps/web/src/lib/sanity/fallback.ts`. The Studio deploy passes it to
the Studio as `SANITY_STUDIO_PROJECT_ID`.

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

### `SANITY_DEPLOY_TOKEN__PRODUCTION`

Lets CI deploy the Studio to https://battersea-cougars.sanity.studio on every push to `release`.

- **Issued by:** Sanity → manage → project → API → Tokens, role **Deploy Studio**. Token name:
  `SANITY_DEPLOY_TOKEN__PRODUCTION`.
- **Used by:** the `studio` job in `deploy.yml` (`sanity deploy`, which reads it as `SANITY_AUTH_TOKEN`).
  Production only: `main` and PRs never deploy the Studio.
- **Gets there by:** CI pull from Secrets Manager (`cougars`); the job maps `SANITY_DEPLOY_TOKEN` to
  `SANITY_AUTH_TOKEN`. Never name it `SANITY_STUDIO_*`: the Studio build puts those variables in its public
  JavaScript.
- **Expires:** no.
- **Rotate:** add a new Deploy Studio token with the same name, update Secrets Manager, push `release` (or re-run
  the job), delete the old token.

### YouTube API keys

Lets the website build list the club YouTube channel's videos (`apps/web/src/lib/youtube.ts`,
[ADR 0015](docs/adr/0015-youtube-channel-pull.md)). One key per environment, so a leaked dev key can be revoked
without touching production. Without a key the build still passes and shows only the videos in Sanity.

- **Issued by:** Google Cloud console, one project for the club (free, no billing account). **APIs & Services →
  Library → YouTube Data API v3 → Enable**, then **Credentials → Create credentials → API key**. Name it like
  the secret, and under **API restrictions** pick **Restrict key → YouTube Data API v3** only. No application
  restriction: CI has no fixed IP address. Both keys can live in the same project; they share its free quota of
  10,000 units a day, and a build uses about 5.
- **Used by:** the website build (code reads `YOUTUBE_API_KEY`). It reads public data only and is never sent to the
  browser.
- **Gets there by:** CI pull from Secrets Manager (`env-pull.mjs --github-env` exports it to the Build step), or
  `node scripts/env-pull.mjs -- npm run build` locally (dev key).
- **Expires:** no.
- **Rotate:** Credentials → the key → **Regenerate key**, update Secrets Manager, run a deploy.

### Settings that aren't secret

| Name                                    | Where                       | What                                                             |
| --------------------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `SITE_URL`                              | GitHub variable             | Production URL, once there is a domain                           |
| `BWS_SERVER_URL`                        | GitHub variable, your shell | `https://vault.bitwarden.eu` if the vault is on the EU server    |
| `SANITY_DATASET`                        | Default `production`        | Overridden by `SANITY_DATASET__DEV` for dev                      |
| `SANITY_STUDIO_PROJECT_ID` / `_DATASET` | Your shell, CI              | Studio's project; the dataset for its seed and migration scripts |
| `DEMO_CONTENT`                          | `.env`, GitHub variable     | Sample content + `noindex`; `true` on production only pre-launch |
| `PUBLIC_BUILD_VERSION`                  | Set by CI                   | Shown in `<meta name="generator">`; checked by the smoke test    |

## Docs

- [docs/setup.md](docs/setup.md): one-time account setup (Cloudflare, Sanity, Bitwarden, GitHub)
- [docs/editing.md](docs/editing.md): guide for club editors (no coding)
- [docs/roadmap.md](docs/roadmap.md): what's next (attendance, payments, Kumite)
- [docs/adr/](docs/adr/README.md): architecture decisions, and why
- [db/README.md](db/README.md): database conventions
- [CLAUDE.md](CLAUDE.md): conventions for contributors and AI agents

## Ports (devcontainer)

Cougars owns ports **4500-4529** so it doesn't clash with other projects on the host:
4500 web, 4510 ops app, 4520 Sanity Studio. Worktrees use 4501-4509 (web) and 4521-4529 (Studio).

## Worktrees (parallel streams)

Parallel work streams ([roadmap](docs/roadmap.md)) each get a git worktree under `.worktrees/`, with their own
dependencies, local D1 database and ports, so each can be previewed while `main` runs on 4500:

```sh
bash scripts/worktree.sh add cms       # branch cms, installs and migrates
bash scripts/worktree.sh dev cms       # http://localhost:4501 (dev secrets if Bitwarden is unlocked)
bash scripts/worktree.sh studio cms    # http://localhost:4521
bash scripts/worktree.sh stop cms      # stop its website (Astro runs it in the background)
bash scripts/worktree.sh remove cms    # when the stream has landed on main
```

| Stream    | Website | Studio |
| --------- | ------- | ------ |
| `cms`     | 4501    | 4521   |
| `youtube` | 4502    | 4522   |
| `gallery` | 4503    | 4523   |

A Studio on a new port needs that origin added once under the Sanity project's API → CORS origins
(e.g. `http://localhost:4521`, with credentials).

Opening the devcontainer installs dependencies, migrates the local D1 database and starts **web** and **ops**
automatically (VS Code tasks in `.vscode/tasks.json`, each in its own terminal). Start the Studio with
_Terminal → Run Task… → dev: studio_.
