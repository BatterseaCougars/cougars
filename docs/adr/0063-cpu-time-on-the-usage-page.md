# 0063. The Usage page shows CPU time per request, and a stopped request is an email

- **Status:** Accepted. Follows [0059](0059-usage-page-and-check.md).
- **Date:** 2026-10-07

## Context

On the Workers free plan a request may compute for 10 ms. Waiting on D1, Sanity or another fetch doesn't count;
running our code does (rendering, JSON, loops, crypto). Past 10 ms Cloudflare stops the request and it fails with
error 1102. The same applies to a cron run. Raising the limit needs Workers Paid ([ADR 0003](0003-free-tiers-only.md)).
0059 watched requests and D1 rows, but nothing told anyone a request was getting close to the limit, or had been stopped.

## Decision

- **Settings → Security → Usage** also shows each Worker's CPU time per request today: typical (p50) and the
  slowest 1 in 100 (p99), against 10 ms, and how many requests were stopped for going over.
- **The hourly check** emails the admins once a day (`usage_warnings`, metric `cpu`) when any request was stopped,
  with the count per Worker.
- Both come from the same GraphQL query and read-only token as 0059: `workersInvocationsAdaptive` quantiles, and
  the same dataset filtered to `status: "exceededResources"`.
- Code is written to stay well under the limit: aggregate in SQL rather than in JavaScript, page anything that grows
  (`LIMIT`), do heavy work at build time (prerendered pages) or in the browser, and never hash passwords or process
  images in a Worker. Sign-in is already a code or link ([0023](0023-device-bound-sign-in.md)), not a password.

## Consequences

- A slow route shows up as a rising p99 before it fails, and a failure is an email, not a member's report.
- No extra Worker requests: it's part of the query 0059 already makes.
- Tests can't measure Worker CPU (Node and in-memory SQLite aren't workerd), so the guard is this measurement in
  production plus the rules above, not a test.
