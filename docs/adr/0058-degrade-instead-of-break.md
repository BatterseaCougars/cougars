# 0058. Degrade instead of break: the app's own brake, and local fallback content

- **Status:** Accepted. Adds to [0055](0055-circuit-breakers.md) (circuit breakers) and
  [0056](0056-rate-limits-on-every-api.md) (rate limits).
- **Date:** 2026-10-07

## Context

The breakers (0055) protect the outside services we call. Nothing protected Cloudflare's own free allowance, which
the website and the team app share on one account: 100,000 Worker requests a day, and D1's 5 million rows read and
100,000 written a day, all reset at 00:00 UTC. Static files (prerendered pages, the app's own files) are free and
unlimited; every `/api/*` call is a Worker request.

The rate limits (0056) cap requests per address per minute, not per day: one stuck tab at the team API's 600 a
minute would spend the day's requests in under three hours. A request our Worker refuses has already run, so it
still counts. Cloudflare's free rate-limiting rule blocks before the Worker, but only on a custom domain (M5).

Separately, `astro dev` treated Sanity like a build: any failure, a spent quota included, was an error page.

## Decision

- **The team app brakes itself** (`team/app/src/app/brake.ts`). Every call to the Worker goes through it:
  - Background checks for others' changes (the Draft page's, catching up when you come back to the app) wait after
    a failure: 10 s, doubling, up to 5 minutes; a success puts them back. A 403 or 409 isn't the server failing.
  - One tab makes at most 3,000 calls a UTC day; past that it says it has paused itself.
  - Cloudflare's error 1027 (the day's Worker requests are used up) rests the tab until midnight UTC, and the app
    says when it's back in London time ("Back soon"), instead of "Can't reach the club's data".
  - Any other 429 that isn't ours (ours are JSON and say why), such as a challenge, slows background checks for a
    minute, as our own per-minute limit does.
- **The Draft page checks every 10 seconds**, only on draft day, while there are picks left and the page is visible.
  Only the captains and those running the draft see it.
- **`astro dev` renders with fallback content** when Sanity can't be read, with a banner saying why. Builds still
  fail loudly, so a broken deploy never replaces the live site; live server routes already fell back.

## Consequences

- A tab that's gone wrong costs at most 3,000 requests a day, not the club's 100,000.
- After an outage, the app's background checks come back within five minutes, not instantly.
- A draft night of 20 phones is about 120 Worker requests a minute (each check is a request and a few small
  queries): fine for an evening, a few percent of the day.
- Still to do: Cloudflare's free rate-limiting rule once there's a custom domain (M5), and a daily usage check that
  warns before an allowance runs out.
