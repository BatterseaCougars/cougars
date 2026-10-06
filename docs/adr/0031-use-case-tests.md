# 0031. Tests describe what people do, against a fake world

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

So far the tests cover functions: recurrence rules, slugs, navigation, and the SQL helpers against in-memory
SQLite. They prove the parts work, but not that a member can sign up for Friday or an admin can close the register.
Gwenda's ops app (`gwenda-hackney/ark`, `docs/testing.md`) tests the other way round: most of its tests describe
what someone does, drive the real API handlers end to end, and fake every outside service in memory. That has
caught integration bugs that function tests miss, and the tests read as a description of the product.

## Decision

We test the same way, in both projects, from now on.

- **Use cases first.** The main tests describe what a person does ("an admin adds a weekly training", "a member
  says they're in", "the door marks a walk-in") and check what that person would then see, and what reached the
  outside world (email sent, YouTube upload opened, Sanity document written). They call the real Worker handlers
  with a real request.
- **One fake world** (`shared/testing/fake-world.ts`): D1 as in-memory SQLite with every migration applied
  (`d1-sqlite.ts`), and in-memory Gmail, Sanity, YouTube, Turnstile and Google sign-in behind one global `fetch`.
  Any outside call the fake doesn't know **throws with its URL**, so a new integration shows up as a failing test,
  not a silent network call.
- **Unit tests only for tricky pure logic** (recurrence, the solver, standings, slugs, permissions), where it's
  easier to cover every case in isolation. Not by default.
- **Known bugs stay in the suite** as `it.fails("… (known bug #N)")`, linked to the issue. The PR that fixes the
  bug changes it back to `it`.
- Tests we already have stay as they are until they are rewritten as use cases (tracked in a GitHub issue); new
  work follows this ADR.

How to write them: [docs/testing.md](../testing.md).

## Consequences

- Tests describe behaviour a person would recognise, and survive refactors of the code underneath.
- The fake world is code we have to keep honest: when a provider behaves differently from the fake, the fake gets
  fixed first, with a test.
- Use cases are slower than unit tests (a migrated SQLite per world), still well under a second each.
- The team app's demo store gets no use-case tests; they start with its first API handlers (team-app T1).
