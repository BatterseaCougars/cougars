# 0093. The local-only switches work only on a private address

- **Status:** Accepted. Amends [0035](0035-sessions-are-hashed-tokens.md).
- **Date:** 2026-10-09

## Context

[0035](0035-sessions-are-hashed-tokens.md) gave the team app two switches for your own machine: `TEAM_ENV=local`
makes `/api/auth/start` return the sign-in code in its reply (nothing is emailed from a laptop), and
`TEAM_AUTO_ADMIN=1` makes any request without a session the first admin. Only `vite`'s serve config sets them; a
build carries neither, and `scripts/ci/target.mjs` writes only `SITE_ENV`.

A security review (2026-10-09) found nothing stood behind that. One stray `vars` entry in a config, and a deployed
worker would hand anyone any member's code, or sign everyone in as the first admin. Nothing tested the deployed
config, and nothing at the worker asked whether it was really on someone's machine.

## Decision

- **Both switches also need a private address.** `localHere(env, request)` is true only when `TEAM_ENV` is
  `local` _and_ the request's host is loopback, a private range (10/8, 172.16/12, 192.168/16), `localhost`, or a
  `.test` name (reserved, never public; the tests' host). A deployed worker is reached by its public name, so on
  it the switches do nothing even if set. Your phone on the house wifi still reaches your laptop by its LAN
  address, as before.
- **A test reads `wrangler.jsonc` and `target.mjs`** and fails if either names a switch
  (`scripts/team-app-config.test.mjs`).
- **The deploy's smoke test** asks the live worker for `/api/bootstrap` with no session and fails unless it's 401.

## Consequences

- Three independent things now have to go wrong for a deploy to open up: the config, the test and the smoke
  test. Before, one did.
- A tunnel to your laptop (a public name onto a local server) no longer gets the code on screen or the auto
  admin; sign in from the laptop's own address instead.
