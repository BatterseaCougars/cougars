# One-time setup

Everything here is free. It takes about an hour. Do the steps in order; each one says which value goes where.

There are two environments, each on its own Cloudflare account ([ADR 0010](adr/0010-two-environments.md)):
**production** (account _Cougars_, the live site) and **dev** (account _Cougars Dev_: PR previews, design
previews, your machine).

All secrets go into **Bitwarden Secrets Manager** and nowhere else. **Name every token exactly like its
secret**, for example a Cloudflare token called `CLOUDFLARE_API_TOKEN__PRODUCTION`. Each secret is described in
[README.md#secrets](../README.md#secrets); the rules are in [ADR 0002](adr/0002-secrets-in-bitwarden.md).

## 1. Cloudflare: two accounts (hosting + database)

Do this twice: once for **Cougars** (production), once for **Cougars Dev** (dev).

1. Create a free account at <https://dash.cloudflare.com/sign-up> (or add a second account to your login).
2. **Workers & Pages** → pick a `*.workers.dev` subdomain. Production will be at
   `https://cougars.<subdomain>.workers.dev` until we buy a domain; dev at `https://cougars-dev.<subdomain>.workers.dev`.
3. Copy the **Account ID** (account home page).
4. **Manage Account → Account API Tokens → Create Token** (account-owned, so it doesn't depend on one person's
   login). Scope **Entire _account_**; permissions **Workers Admin** (Editor can't create a new worker) and **D1 Write**. Name it
   `CLOUDFLARE_API_TOKEN__PRODUCTION` on Cougars, `CLOUDFLARE_API_TOKEN__DEV` on Cougars Dev. Copy it.

Bitwarden secrets (step 3): `CLOUDFLARE_API_TOKEN__PRODUCTION`, `CLOUDFLARE_ACCOUNT_ID__PRODUCTION` in
`cougars`; `CLOUDFLARE_API_TOKEN__DEV`, `CLOUDFLARE_ACCOUNT_ID__DEV` in `cougars-dev`.

## 2. Sanity (content editing)

Two free projects, one per environment, like the two Cloudflare accounts
([ADR 0017](adr/0017-two-sanity-projects.md)). Both exist already:

| Project         | ID         | Dataset               | Used by                                                      |
| --------------- | ---------- | --------------------- | ------------------------------------------------------------ |
| **Cougars**     | `ah165efl` | `production` (public) | The live site and the hosted Studio                          |
| **Cougars Dev** | `zmg6rbe3` | `production` (public) | The dev site, PR previews, your machine and the local Studio |

The IDs are in `shared/sanity.ts`; the environment picks the project, so nothing about them goes in Secrets
Manager. Public datasets need no read token.

To set up a project from scratch (or check one):

1. `npx sanity login` with your own account, then create the project at <https://www.sanity.io/manage> (Free
   plan) with one public dataset, `production`, and put its ID in `shared/sanity.ts`.
2. **API → CORS origins**:
   - Cougars Dev: `http://localhost:4520` to `http://localhost:4523`, with credentials (local Studios, including
     worktrees).
   - Cougars: nothing to add; the hosted Studio adds its own origin when it's deployed.
3. **Cougars → API → Tokens**: a **Deploy Studio** token named `SANITY_DEPLOY_TOKEN__PRODUCTION`, into Secrets
   Manager (`cougars`). CI deploys the Studio with it on every push to `release`.
4. Seed the club facts (Club, Fridays, Pub, Team, Kumite) from the website's defaults, dev first. The scripts use
   your own login:
   ```sh
   npm run seed -w @cougars/studio                                    # Cougars Dev
   SANITY_STUDIO_SITE_ENV=production npm run seed -w @cougars/studio  # Cougars
   ```
   A project that still has the old `siteSettings` document is migrated instead: run
   `npm run migrate-settings -w @cougars/studio` (a dry run), then again with `-- --commit`.
5. **Members**: invite the club's editors to **Cougars** with the _Editor_ role (the Free plan includes 20
   seats), and to **Cougars Dev** if they want somewhere to practise. Vision, the query tool, only appears for
   administrators.

## 3. Bitwarden Secrets Manager

1. At <https://bitwarden.com>, create a free **organisation**, then enable **Secrets Manager** (the Free plan is
   enough).
2. Create two projects: **`cougars`** (production values, `NAME__PRODUCTION`) and **`cougars-dev`** (dev values,
   `NAME__DEV`, and shared plain `NAME`s). Add the secrets from steps 1, 2 and 5 with exactly those names.
3. **Machine accounts**, each with one access token (names and the matrix are in
   [README.md#bitwarden-tokens](../README.md#bitwarden-tokens)):
   - `cougars-ci`: `cougars` and `cougars-dev`. Token `BWS_ACCESS_TOKEN__PRODUCTION`, in GitHub environment `production`.
   - `cougars-ci-dev`: `cougars-dev` only. Token `BWS_ACCESS_TOKEN__DEV`, in GitHub environment `preview`.
   - `cougars-ci` and `cougars-ci-dev` get **Can read** only.
   - `cougars-local`: **Can read, write** on both, so you can add secrets from the shell. Token
     `COUGARS_LOCAL_BW_TOKEN`, in your vault as a secure note `cougars/.env.local` with the line
     `COUGARS_LOCAL_BW_TOKEN=...`.
4. If your vault is on the EU server (`vault.bitwarden.eu`), remember that for step 4.

Locally, **`bw-unlock` is the login**: once per container start, then every script finds the token itself. The
devcontainer keeps its own Bitwarden login (volume `cougars-bitwarden-cli`), separate from your host's.

```sh
bw config server https://vault.bitwarden.eu   # once
bw login                                      # once, as the account in the Cougars org
bw-unlock                                     # each container start
node scripts/env-pull.mjs --status            # lists secret names (dev)
```

## 4. GitHub

In `das974/cougars` → **Settings**:

1. **Environments**:
   - `production`: deployment branches **`release` only**. Secret `BWS_ACCESS_TOKEN__PRODUCTION`.
   - `preview`: Secret `BWS_ACCESS_TOKEN__DEV`.
   - No repository-level secrets.
2. **Variables → Actions** (optional):
   - `BWS_SERVER_URL`: `https://vault.bitwarden.eu` if your vault is on the EU server.
   - `SITE_URL`: the production URL, once there is a domain.
3. Deploy dev once, so the `cougars-dev` worker exists before the first PR preview:
   ```sh
   node scripts/env-pull.mjs -- bash scripts/deploy-dev.sh
   ```

`main` deploys dev; `git push origin main:release` deploys production ([ADR 0013](adr/0013-main-deploys-dev.md)). The
first production deploy creates the D1 database and applies migrations.

## 5. Publish → rebuild webhook

This makes the live site rebuild about 2 minutes after an editor presses **Publish**.

1. GitHub → **Settings → Developer settings → Fine-grained tokens**: create a token named
   `SANITY_WEBHOOK_GITHUB_TOKEN__PRODUCTION` for `das974/cougars` only, with permission **Contents: Read and
   write**. Add it to Secrets Manager (`cougars`) under the same name. (GitHub requires this to start a
   workflow; it can't push anything the workflow doesn't.)
2. In Sanity **manage → Cougars → API → Webhooks → Create**:
   - URL: `https://api.github.com/repos/das974/cougars/dispatches`
   - Dataset: `production`
   - Trigger on: Create, Update, Delete
   - Filter: `_type in ["club","fridays","pub","team","kumite","kumiteResult","event","video","player","sponsor"]`
     (not `album`: photos are read live, with no rebuild)
   - Projection: `{"event_type": "sanity-publish"}`
   - HTTP method: POST
   - HTTP headers:
     - `Authorization: Bearer <token>`
     - `Accept: application/vnd.github+json`
   - Leave **drafts** off, so only published changes trigger a rebuild.

## 6. Later: domain

Buy the domain with Cloudflare Registrar (at cost, about £10 a year), on the **Cougars** account. Then go to
**Workers → cougars → Settings → Domains & Routes → Add custom domain**, and set the GitHub variable `SITE_URL`.

The form rate limit starts working at this point: Cloudflare's Cache API is disabled on `*.workers.dev`.
