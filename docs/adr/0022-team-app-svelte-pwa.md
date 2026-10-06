# 0022. The team app is a mobile-first Svelte 5 SPA on a Worker, as a PWA

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The team app is used mostly on phones at the rink: a game clock that must keep running with no signal, a live
draft, drag-and-drop teams, a door register. It may become a store app later. The website's Astro setup
([0004](0004-astro-workers-sanity-d1.md)) is built for prerendered pages, not app screens.

Gwenda's ops app is a Svelte 5 + Vite SPA with a phone shell (bottom tabs derived from one route tree, a More
page, a desktop rail) that works well, and we know it.

## Decision

- `team/app` is a **Svelte 5 + Vite single-page app** with client-side routing, served as static assets by its own
  Cloudflare **Worker** (`cougars-team`, dev `cougars-team-dev`), which also answers `/api/*` with JSON.
- It binds the same D1 database as the website (`DB`); migrations stay in `db/`.
- **Mobile first.** The shell follows Gwenda ops: one route tree, five bottom tabs at ≤900px with safe-area insets,
  a full-page More, a collapsible rail on desktop.
- **A PWA**: manifest, icons and a service worker that caches the app shell. Screens that must work offline (the
  game clock) keep their data in IndexedDB and sync when there's signal.
- A store app, if we want one, wraps the same build with Capacitor (team-app T9).
- CLAUDE.md's Astro rules apply to the website only. Shared rules (D1 through `shared/d1.ts`, Europe/London dates,
  tests) apply to both.

## Consequences

- Two front-end stacks in one repo (Astro and Svelte); shared code must stay framework-free.
- The SPA works offline and installs to the home screen; it can't rely on server-rendered pages, so every screen
  loads data from `/api`.
- Workers' free tier counts each API call; static assets are free.
- On iPhone, a link opened from an email goes to Safari, not the installed app ([0023](0023-device-bound-sign-in.md)
  works around this for sign-in).
