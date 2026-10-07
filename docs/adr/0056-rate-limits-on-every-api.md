# 0056. Every live route and API is rate limited

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Only sign-in (10 per address per 10 minutes) and the join form (5 per address per hour) were rate limited. Any other
route could be called as often as anyone liked: a loop in a script, a scraper or a stuck browser could spend the free
tier's Worker requests (100k a day, shared by the website and the team app), D1 reads and, through the website, the
Sanity and YouTube quotas.

## Decision

- Limits use the existing `shared/rate-limit.ts` (Workers Cache API: free, per data centre, best effort, not a
  security boundary).
- The website limits each address to 240 live requests a minute (`src/middleware.ts`). Prerendered pages are static
  assets and never reach the Worker.
- The team app limits:

  | What                      | Limit                    |
  | ------------------------- | ------------------------ |
  | Any `/api` request        | 600 a minute per address |
  | A change (not a GET)      | 60 a minute per member   |
  | Asking for a sign-in code | 10 per 10 minutes        |
  | The join form             | 5 an hour                |

  Per address is generous because a whole squad on the rink's wifi shares one. The limits live in
  `team/app/worker/limits.ts`.

- Over a limit, the answer is a 429 with a plain sentence saying to wait.

## Consequences

- One misbehaving client can't use up the club's free quotas.
- The Cache API only works on a custom domain; on `*.workers.dev` the limits do nothing, as for sign-in today.
- Not atomic: a burst can go slightly over a limit. Cloudflare's own rate limiting would be exact, but its free-plan
  terms haven't been checked; this costs nothing.
