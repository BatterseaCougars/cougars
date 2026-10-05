# 0018. Studio changes go live at the daily rebuild until the team app triggers builds

- **Status:** Accepted. Amends [0004](0004-astro-workers-sanity-d1.md) and [0013](0013-main-deploys-dev.md)
  (their "a Studio publish triggers a production rebuild").
- **Date:** 2026-10-05

## Context

Most pages are built ahead of time from Sanity, so a Studio change only reaches the live site when production
rebuilds. The plan was a Sanity webhook calling GitHub on every publish, which needs a GitHub token
(`SANITY_WEBHOOK_GITHUB_TOKEN__PRODUCTION`) stored in Sanity and renewed yearly.

Gwenda solves the same problem differently: editors work in its ops app, which asks a small Worker to start the
GitHub build, batched after ten quiet minutes, with the GitHub token held by that Worker. The Cougars team app
(roadmap M6) is where the team manager will eventually edit events, players and Kumite results, so it's the natural
owner of this trigger too.

## Decision

We won't set up the Sanity publish webhook. Until the team app exists:

- Production rebuilds **daily** (the `schedule` in `deploy.yml`, 04:30 UTC) and on every release. A Studio change is
  live the next morning.
- Photos are unaffected: they're read live ([ADR 0016](0016-live-photo-gallery.md)).
- Anything urgent is rebuilt by hand: **Actions → Deploy → Run workflow → `release`** (or
  `gh workflow run deploy.yml --ref release`).

The team app will start production rebuilds when content changes, batched, holding its own GitHub token. The
`repository_dispatch: sanity-publish` trigger stays in `deploy.yml` for it.

## Consequences

- No GitHub token in Sanity, and nothing to renew yearly.
- The team manager waits until the next morning to see Studio changes (the editor guide says so), or asks the
  developer for a rebuild.
- The daily rebuild now matters for content as well as YouTube uploads; if it fails, Studio changes don't go live.
- M6 picks up the trigger and the token (`docs/roadmap.md`).
