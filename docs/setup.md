# One-time setup

Everything here is free. It takes about an hour. Do the steps in order; each one says which value goes where.

All secrets go into **Bitwarden Secrets Manager** and nowhere else. GitHub only ever holds one secret,
`BWS_ACCESS_TOKEN`, which lets CI read the rest. **Name every token you create exactly like its secret**
(for example a Cloudflare token called `CLOUDFLARE_API_TOKEN`). Each secret is described in
[README.md#secrets](../README.md#secrets); the rules are in [ADR 0002](adr/0002-secrets-in-bitwarden.md).

## 1. Cloudflare (hosting + database)

1. Create a free account at <https://dash.cloudflare.com/sign-up>.
2. **Workers & Pages** → pick a `*.workers.dev` subdomain (e.g. `batterseacougars`). The site will live at
   `https://cougars.<subdomain>.workers.dev` until we buy a domain.
3. Copy your **Account ID** (right-hand side of the Workers & Pages overview).
4. **My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template**, then add the permission
   **Account → D1 → Edit**. Restrict it to your account. Name it `CLOUDFLARE_API_TOKEN`. Copy the token.

Bitwarden secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.

## 2. Sanity (content editing)

1. `npx sanity login`, then create a project at <https://www.sanity.io/manage> (Free plan), with dataset
   `production` (public).
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

Bitwarden secrets: `SANITY_PROJECT_ID`, `SANITY_API_TOKEN` (the Viewer token).

## 3. Bitwarden Secrets Manager

1. At <https://bitwarden.com>, create a free **organisation**, then enable **Secrets Manager** (the Free plan is
   enough).
2. Create a project `cougars`, and add the four secrets from steps 1 and 2 with exactly those names.
   - The naming rule: `NAME` applies everywhere. To override one for PR previews only, add `NAME__PREVIEW`.
3. **Machine accounts → New** → `github-ci`, with **read** access to the `cougars` project → create an
   **access token** named `BWS_ACCESS_TOKEN`. Copy it.
4. If your vault is on the EU server (`vault.bitwarden.eu`), remember that for step 4.

Locally, export the token in your shell. Don't save it in a file in the repo.

```sh
export BWS_ACCESS_TOKEN=...            # add BWS_SERVER_URL=https://vault.bitwarden.eu for EU
node scripts/env-pull.mjs --status     # lists secret names
```

## 4. GitHub

In `das974/cougars` → **Settings**:

1. **Environments**: create `production` and `preview`.
2. **Secrets → Actions**: add the repository secret `BWS_ACCESS_TOKEN`.
3. **Variables → Actions** (all optional):
   - `BWS_SERVER_URL`: set to `https://vault.bitwarden.eu` if your vault is on the EU server.
   - `BWS_PROJECT_ID`: limits CI to the `cougars` project.
   - `SITE_URL`: the public URL, once there is a domain.

The first merge to `main` creates the D1 database, applies migrations and deploys. The workflow log prints
the database id. Paste it into `apps/web/wrangler.jsonc` as `"database_id"` and commit it, so local
`--remote` commands work too.

## 5. Publish → rebuild webhook

This makes the site rebuild about 2 minutes after an editor presses **Publish**.

1. GitHub → **Settings → Developer settings → Fine-grained tokens**: create a token named
   `SANITY_WEBHOOK_GITHUB_TOKEN` for `das974/cougars` only, with permission **Contents: Read and write**.
   Add it to Secrets Manager under the same name. (GitHub requires this to start a workflow; it can't push
   anything the workflow doesn't.)
2. In Sanity **manage → API → Webhooks → Create**:
   - URL: `https://api.github.com/repos/das974/cougars/dispatches`
   - Dataset: `production`
   - Trigger on: Create, Update, Delete
   - Filter: `_type in ["siteSettings","event","video","album","post","sponsor"]`
   - Projection: `{"event_type": "sanity-publish"}`
   - HTTP method: POST
   - HTTP headers:
     - `Authorization: Bearer <token>`
     - `Accept: application/vnd.github+json`
   - Leave **drafts** off, so only published changes trigger a rebuild.

## 6. Later: domain

Buy the domain with Cloudflare Registrar (at cost, about £10 a year). Then go to **Workers → cougars →
Settings → Domains & Routes → Add custom domain**, and set the GitHub variable `SITE_URL`.

The form rate limit starts working at this point: Cloudflare's Cache API is disabled on `*.workers.dev`.
