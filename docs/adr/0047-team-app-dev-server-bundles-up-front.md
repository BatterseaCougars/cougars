# 0047. The team app's dev server bundles every library up front, and only one runs per checkout

- **Status:** Accepted. Builds on [0022](0022-team-app-svelte-pwa.md).
- **Date:** 2026-10-07

## Context

In dev, Vite bundles the browser's libraries into `team/app/node_modules/.vite/deps/` and serves them with a
version stamp in the URL. Two things kept changing that stamp under an open tab, which then got 504s
("Outdated Optimize Dep") and a blank main screen:

- Vite found libraries lazily. Opening a screen the startup crawl hadn't reached made it rebundle mid-session.
- A second `vite` in the same checkout (another session, a `--force` restart) rebuilds that folder **before** it
  tries the port, so it broke the running server's page even though `strictPort` then stopped it.

## Decision

- `optimizeDeps.entries` crawls every source file at startup, not just what `index.html` reaches.
- `optimizeDeps.include` is every package in team/app `package.json` **dependencies**, read from the file, so adding a
  library configures dev with no config edit. Svelte's entry points come from the Svelte plugin.
- A browser library goes in `dependencies`, never `devDependencies`. `scripts/team-app-deps.test.mjs` fails `npm test` if
  the app imports a package that isn't there.
- A small plugin in `vite.config.ts` refuses to start a second dev server while 4510 is serving, before it touches
  the cache. Vite's own restart after a config edit is the same process and is let through.

## Consequences

- Hot reload is unchanged; editing code never rebundles libraries.
- Installing a new library while the server runs still makes Vite rebundle once and reload the open page itself.
  That's expected, not the stale-cache failure.
- Cold start crawls all of `src`, a second or so more.
- To restart the dev server, stop the running one first. Starting another beside it is refused.
