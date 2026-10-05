# 0001. Record architecture decisions here

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

The club site is built by a small, changing group (and AI agents) for a client who isn't a developer.
Decisions made in chat get lost, and the next person re-opens them.

## Decision

We will record significant decisions as short ADRs in `docs/adr/`, numbered, one per file, using
[template.md](template.md). Agent instructions (`CLAUDE.md`, `.github/copilot-instructions.md`) point here.
Decisions 0002-0009 were recorded retroactively on 2026-10-05, from choices made while building the POC.

## Consequences

A decision change means a new ADR, not a quiet edit. Anyone, human or agent, about to change how something
works checks here first.
