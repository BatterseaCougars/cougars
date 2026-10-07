# 0055. Outside services are behind circuit breakers

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

The website and the team app call three outside services on free plans: Sanity, YouTube and Gmail. When one of them
said no (Sanity's spent API quota, YouTube's spent daily quota), we kept asking on every request. Each request
waited for the refusal, logged an error, and for a quota kept it spent. Nothing told the person why.

## Decision

- Every call to Sanity, YouTube and Gmail goes through `guard()` in `shared/breaker.ts`.
- A quota or rate-limit answer pauses the service until it resets:

  | Service | Answer                                   | Paused until                 |
  | ------- | ---------------------------------------- | ---------------------------- |
  | Sanity  | 402 (plan quota spent)                   | an hour, then try again      |
  | Sanity  | 429                                      | Retry-After, else a minute   |
  | YouTube | 403 `quotaExceeded`/`dailyLimitExceeded` | midnight Pacific (its reset) |
  | YouTube | 429 or a rate-limit reason               | Retry-After, else a minute   |
  | Gmail   | 429 or a rate/sending-limit reason       | Retry-After, else 15 minutes |

- Three failures in a row (network, timeout, 5xx) pause it for 30 seconds, doubling each time the trial call after a
  pause fails too, up to 15 minutes. Another 4xx is our mistake and doesn't count.
- The pause is kept in memory and in the Workers Cache API, so every isolate in a data centre sees it. Best effort,
  like `shared/rate-limit.ts`; it's free.
- While paused, callers fall back as for any failure: the website shows the last good copy (ADR 0054) or its empty
  state; sign-in says "Email isn't sending right now" at once, the same for members and strangers, instead of
  promising a code that can't come. A pause is logged once (`breaker.open`), not on every request.

## Consequences

- A spent quota costs one refused call, not one per page view, and recovers on its own when the quota resets.
- Pages don't wait on a service that's down.
- A pause can outlast a fix by up to its length (15 minutes for Gmail, an hour for Sanity's quota). A deploy starts
  new isolates, but the Cache API copy remains until it expires.
