# 0105. Code is grouped by feature, entry points read like a table of contents, and file names say domain and kind

- **Status:** Accepted
- **Date:** 2026-10-10

## Context

This code is still for people to read. The team app's API was one file, `apps/team/worker/api.ts`, 1,236 lines:
every route (72), its action, its record and its handler. An entry point is where a person starts to understand an
app, and at that size it took holding the whole API in your head to find one feature. Nothing said how code should be
grouped, so it grew wherever was convenient.

## Decision

- **Group by feature, not by technique.** The controller idea, without controllers: what a person would call a feature
  (members, dues, training, the draft, scoring) is one place, holding its routes beside its rules and its queries.
- **Entry points are short and read like a table of contents.** The API's `api.ts` names every feature, in an order a
  person would explain the app in, mounts their routes, and does only what they share (who's asking, the action check,
  the record, the parts a change sends back, the live hub). It doesn't hold any feature's routes.
- **File names say domain and kind**: `{domain}.{kind}.ts`.
  - `{domain}.ts`: the domain's logic and queries (`dues.ts`, `draft.ts`)
  - `{domain}.routes.ts`: its routes (`dues.routes.ts`)
  - `{domain}.use-cases.test.ts`: its stories (ADR 0031)
  - Shared pieces of one thing name it: `api.route.ts` (the shape of a route and its helpers), `api.slices.ts` (the
    club in parts).
- **Folders follow features and stay flat** while the names keep them apart; a feature gets a folder of its own only
  when it has too many files to read in a listing.
- **A size to notice**: a file past roughly 400 lines, or a function past a screen, is a prompt to ask whether it holds
  more than one idea. Not a rule a test enforces.
- **Moving code is its own change**, with behaviour unchanged and the tests as they were; new code goes in the right
  place from the start. Existing code moves feature by feature when it's next worked on, not in one sweep.

## Consequences

- Finding a route means opening its feature's file; `api.ts` fits on a few screens.
- A new route goes in its feature's `.routes.ts`; a new feature is a new file and a line in `api.ts`'s table of contents.
- Larger files remain (`schedule.ts`, 920 lines, holds series, sessions, tournaments, venues and club events); they move
  when next worked on. The team app's `src/lib` is a long flat list and gets the same treatment in its own pass (#88).

## History

- 2026-10-10: Decided, and the team API split into twelve feature route files with an identical route table (#88).
