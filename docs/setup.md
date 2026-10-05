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

1. `npx sanity login`, then create a project at <https://www.sanity.io/manage> (Free plan), with datasets
   `production` and `dev` (both public; the Free plan allows two).
2. Put the **project ID** in `apps/studio/sanity.config.ts` and `apps/studio/sanity.cli.ts` as the default for
   `SANITY_STUDIO_PROJECT_ID`. It isn't a secret.
3. **API → Tokens**: create a **Viewer** token named `SANITY_API_TOKEN` (lets the website build read content).
4. **API → CORS origins**: add `http://localhost:4520` (allow credentials).
5. Seed the club details from the old Wix site, and publish the Studio:
   ```sh
   SANITY_STUDIO_PROJECT_ID=<id> npm run seed -w @cougars/studio
   SANITY_STUDIO_PROJECT_ID=<id> npm run deploy -w @cougars/studio   # → https://battersea-cougars.sanity.studio
   ```
6. **Members**: invite the club's editors (the Free plan includes 20 seats). Give them the _Editor_ role.

Bitwarden secrets (step 3, in `cougars-dev`, shared by both environments): `SANITY_PROJECT_ID`,
`SANITY_API_TOKEN`, and `SANITY_DATASET__DEV` = `dev`.

## 3. Bitwarden Secrets Manager

1. At <https://bitwarden.com>, create a free **organisation**, then enable **Secrets Manager** (the Free plan is
   enough).
2. Create two projects: **`cougars`** (production values, `NAME__PRODUCTION`) and **`cougars-dev`** (dev values,
   `NAME__DEV`, and shared plain `NAME`s). Add the secrets from steps 1, 2 and 5 with exactly those names.
3. **Machine accounts**, each with an access token named `BWS_ACCESS_TOKEN`:
   - `cougars-ci`: **read** on `cougars` and `cougars-dev`. Its token goes in GitHub environment `production`.
   - `cougars-ci-dev`: **read** on `cougars-dev` only. Its token goes in GitHub environment `preview`.
   - one for yourself: **read** on `cougars-dev` (add `cougars` only if you need production values).
4. If your vault is on the EU server (`vault.bitwarden.eu`), remember that for step 4.

Locally, export your token in your shell. Don't save it in a file in the repo. Your machine is dev.

```sh
export BWS_ACCESS_TOKEN=...            # add BWS_SERVER_URL=https://vault.bitwarden.eu for EU
node scripts/env-pull.mjs --status     # lists secret names (dev)
```

## 4. GitHub

In `das974/cougars` → **Settings**:

1. **Environments**:
   - `production`: deployment branches **`main` only**. Secret `BWS_ACCESS_TOKEN` = the `cougars-ci` token.
   - `preview`: Secret `BWS_ACCESS_TOKEN` = the `cougars-ci-dev` token.
   - No repository-level secrets.
2. **Variables → Actions** (optional):
   - `BWS_SERVER_URL`: `https://vault.bitwarden.eu` if your vault is on the EU server.
   - `SITE_URL`: the production URL, once there is a domain.
3. Deploy dev once, so the `cougars-dev` worker exists before the first PR preview:
   ```sh
   node scripts/env-pull.mjs -- bash scripts/deploy-dev.sh
   ```

The first merge to `main` creates the production D1 database, applies migrations and deploys.

## 5. Publish → rebuild webhook

This makes the live site rebuild about 2 minutes after an editor presses **Publish**.

1. GitHub → **Settings → Developer settings → Fine-grained tokens**: create a token named
   `SANITY_WEBHOOK_GITHUB_TOKEN__PRODUCTION` for `das974/cougars` only, with permission **Contents: Read and
   write**. Add it to Secrets Manager (`cougars`) under the same name. (GitHub requires this to start a
   workflow; it can't push anything the workflow doesn't.)
2. In Sanity **manage → API → Webhooks → Create**:
   - URL: `https://api.github.com/repos/das974/cougars/dispatches`
   - Dataset: `production`
   - Trigger on: Create, Update, Delete
   - Filter: `_type in ["siteSettings","event","video","album","player","sponsor"]`
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
