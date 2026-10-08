# 0081. Team app pages load when opened, the rest in the background

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The team app shipped every page and editor in one chunk: 347 KB of JavaScript (105 KB gzipped) on top of Svelte's
runtime, parsed on a phone before the first paint, whether you open Home or the Draft. AG Grid (Members' table) was
already loaded only when shown, but registered all of its community modules: 1.1 MB (312 KB gzipped).

## Decision

- Each page is its own chunk (`app/pages.svelte.ts`). `main.ts` loads the page you're opening alongside the app, so
  the first paint has it. Once the app's up, the pages you're allowed to open load one at a time while the phone's
  idle, so moving between them doesn't wait.
- A page that isn't in yet when you get to it (a tap before the background load reached it) shows the moment it is.
- AG Grid registers only the modules the grid uses (client-side rows, quick filter, cell classes, auto-size; sorting,
  resizing and pinning are in its core), plus its validation module in dev, which names a missing one.

## Consequences

- Before first paint on Home: 402 KB → 154 KB of JavaScript (126 → 61 KB gzipped). AG Grid: 1.1 MB → 669 KB (312
  → 184 KB gzipped), and still only for admins on Members.
- A new page is added to `LOADERS` in `app/pages.svelte.ts`, not imported by `App.svelte`.
- More, smaller files. Vite preloads a chunk's imports with it, so they arrive together rather than one after
  another; the service worker caches them as they're used.
- A grid feature beyond those modules (a column filter, CSV export) needs its module added in `DataGrid.svelte`; in
  dev AG Grid says which.
