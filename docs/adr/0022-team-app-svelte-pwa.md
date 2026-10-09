# 0022. The team app is a mobile-first Svelte 5 SPA on a Worker, as a PWA, with a dev server that bundles up front

- **Status:** Accepted
- **Date:** 2026-10-06 · updated 2026-10-09
- **Merges:** 0047

## Context

The team app is used mostly on phones at the rink: a game clock that must keep running with no signal, a live draft,
drag-and-drop teams, a door register. It may become a store app later. The website's Astro setup
([ADR 0004](0004-astro-workers-sanity-d1.md)) is built for prerendered pages, not app screens. Gwenda's ops app is a
Svelte 5 + Vite SPA with a phone shell (bottom tabs derived from one route tree, a More page, a desktop rail) that
works well, and we know it.

In dev, Vite bundles the browser's libraries into `team/app/node_modules/.vite/deps/` and serves them with a version
stamp in the URL. Two things kept changing that stamp under an open tab, which then got 504s ("Outdated Optimize Dep")
and a blank main screen: Vite found libraries lazily, so opening a screen the startup crawl hadn't reached made it
rebundle mid-session; and a second `vite` in the same checkout (another session, a `--force` restart) rebuilds that
folder **before** it tries the port, so it broke the running server's page even though `strictPort` then stopped it.

## Decision

- `team/app` is a **Svelte 5 + Vite single-page app** with client-side routing, served as static assets by its own
  Cloudflare **Worker** (`cougars-team`, dev `cougars-team-dev`), which also answers `/api/*` with JSON. It deploys to
  dev from `main`, and to production only at launch ([ADR 0010](0010-environments-and-deploys.md)).
- It binds the same D1 database as the website (`DB`); the schema stays in `db/`.
- **Mobile first.** The shell follows Gwenda ops: one route tree, five bottom tabs at ≤900px with safe-area insets, a
  full-page More, a collapsible rail on desktop.
- **A PWA**: manifest, icons and a service worker that caches the app shell. Screens that must work offline (the game
  clock) keep their data in IndexedDB and sync when there's signal.
- A store app, if we want one, wraps the same build with Capacitor (team-app T9).
- CLAUDE.md's Astro rules apply to the website only. Shared rules (D1 through `shared/d1.ts`, Europe/London dates,
  tests) apply to both.
- **The dev server bundles every library up front** (`team/app/vite.config.ts`):
  - `optimizeDeps.entries` crawls every source file at startup, not just what `index.html` reaches.
  - `optimizeDeps.include` is every package in team/app `package.json` **dependencies**, read from the file, so adding
    a library configures dev with no config edit. Svelte's entry points come from the Svelte plugin.
  - A browser library goes in `dependencies`, never `devDependencies`. `scripts/team-app-deps.test.mjs` fails
    `npm test` if the app imports a package that isn't there.
- **One dev server per checkout, on 4510.** A small plugin in `vite.config.ts` refuses to start a second one while 4510
  is serving, before it touches the cache. Vite's own restart after a config edit is the same process and is let
  through.

## Consequences

- Two front-end stacks in one repo (Astro and Svelte); shared code must stay framework-free.
- The SPA installs to the home screen; it can't rely on server-rendered pages, so every screen loads data from `/api`.
- Workers' free tier counts each API call; static assets are free.
- On iPhone, a link opened from an email goes to Safari, not the installed app ([ADR 0023](0023-sign-in-and-sessions.md)
  works around this for sign-in).
- In dev, hot reload is unchanged; editing code never rebundles libraries. Installing a new library while the server
  runs still makes Vite rebundle once and reload the open page itself; that's expected, not the stale-cache failure.
  Cold start crawls all of `src`, a second or so more.
- To restart the dev server, stop the running one first. Starting another beside it is refused; never `--force`.

## History

- 2026-10-06: The team app is a Svelte 5 SPA and PWA on its own Worker, sharing the website's D1 (0022).
- 2026-10-07: The dev server pre-bundles every dependency at startup and refuses a second server in the same
  checkout, after stale-bundle 504s (0047).
- 2026-10-08: Deployed to dev from `main` now that sign-in exists, not held back until launch (ADR 0010).
