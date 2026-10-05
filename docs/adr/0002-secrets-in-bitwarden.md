# 0002. Secrets live in Bitwarden; `.env` is local overrides only

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

We use API tokens for Cloudflare, Sanity and GitHub, across local machines, CI and preview deploys. Secrets
scattered across `.env` files, GitHub secrets and provider dashboards get leaked, go stale, and nobody knows
which token is which or what breaks when one is revoked. gwenda-hackney/ark solved this with Bitwarden
Secrets Manager and one documented naming rule; we follow it.

## Decision

1. **Bitwarden Secrets Manager is the only store for secrets.** Project `cougars`. CI and scripts load them at
   run time (`scripts/lib/bitwarden.mjs`, `scripts/env-pull.mjs`). GitHub holds exactly one secret,
   `BWS_ACCESS_TOKEN`.
2. **One naming rule.** `NAME` applies to both environments; `NAME__PRODUCTION` / `NAME__DEV` override it for
   that one ([ADR 0010](0010-two-environments.md)). Code only ever reads `NAME`. Production values live in the
   Secrets Manager project `cougars`, dev and shared values in `cougars-dev`.
3. **`.env` is for local overrides only**: non-secret settings for your own machine (for example
   `DEMO_CONTENT=true`). Never a secret. It is gitignored; `.env.example` lists what you may set.
4. **A token is named the same as its secret.** When you create a token at a provider (Cloudflare, Sanity,
   GitHub, a Bitwarden machine-account token), give it the exact Secrets Manager name, for example
   `CLOUDFLARE_API_TOKEN__PRODUCTION`. Then the provider's token list maps one-to-one onto Secrets Manager, and
   revoking or rotating the right one is obvious.
5. **Every secret is documented in the README** ([README.md#secrets](../../README.md#secrets)): why it exists,
   where it was issued, its permissions, who uses it, how it gets there, and how to rotate it. A secret that
   isn't in the README shouldn't exist.

## Consequences

- No secret files to leak. Running something that needs secrets locally means exporting `BWS_ACCESS_TOKEN`
  in your shell and using `node scripts/env-pull.mjs -- <command>`.
- Adding a secret is three steps, every time: create the token with the SM name, add it to SM, add its entry
  to the README.
- Agents must never print, write or commit secret values; they report names only.
