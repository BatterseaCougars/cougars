# 0092. Security headers come from the asset layer too, and the team app has a content security policy

- **Status:** Accepted. Amends [0036](0036-api-security.md).
- **Date:** 2026-10-09

## Context

[0036](0036-api-security.md) put four security headers on "every response" by setting them in the team app's
Worker. A security review (2026-10-09) found they reached only `/api/*`. The team app's `wrangler.jsonc` runs the
Worker first for `/api/*` alone, so the app's own page and files come straight from Cloudflare's asset layer; on
dev, `/` and `/games` answered with none of the headers. The website had never had any: its pages are prerendered
and served the same way. The test that proved the headers called the Worker directly, so it couldn't see this.

The headers matter least where they were (JSON nobody frames) and most where they weren't (the signed-in app).
`SameSite=Lax` cookies soften clickjacking, since a cross-site frame shows the app signed out, but the headers are
the stated control.

## Decision

- **Both apps carry a `_headers` file** in `public/`, which Workers static assets apply to everything they serve.
  The Worker (team app) and the middleware (website's live routes) set the same set on what they answer, and a test
  in each app reads the file and checks it equals the code's set, so the two can't drift.
- **The team app has a content security policy**, not just `frame-ancestors`: it runs only its own scripts, styles
  (inline allowed: Svelte sets style attributes), fonts and files; talks only to its own origin; shows its own
  images plus `data:` (team logos) and `blob:` (upload previews); no objects, no other base, forms only to itself,
  never framed. A new outside resource means widening the policy on purpose, in both places.
- **The website** sends `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff` and
  `Referrer-Policy: strict-origin-when-cross-origin` (it links out and is public, so the origin may travel). A full
  policy for the website (YouTube, Sanity's CDN, Turnstile) is left for when it's worth the upkeep.
- **The deploy's smoke test** fetches the team app's `/` and fails without `X-Frame-Options`, so the headers are
  checked where they're served, not only in a unit test.

## Consequences

- Every page and file from either app is unframeable and unsniffable, and the team app's page can't run a script
  or reach a host that isn't its own, which limits what any injected content could do.
- Adding a CDN, an embed or an analytics script to the team app now takes a deliberate change to the policy in
  `worker/index.ts` and `public/_headers`; the test fails until both agree.
