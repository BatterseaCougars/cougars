# 0098. A change declares what it puts on the record, on its route

- **Status:** Accepted. Amends [0095](0095-the-audit-log-has-a-page.md), which kept writing as calls in each handler.
- **Date:** 2026-10-09

## Context

[0095](0095-the-audit-log-has-a-page.md) gave the audit log a page and kept each entry an `audit()` call placed in
the handler, after the write, with the before and after the handler had read. That's imperative: a new route that
changes who can do what has to remember to call it, and nothing notices when it doesn't. Auditing is a cross-cutting
concern, and the routes already declare their others the same way: `action` (who may) and `changes` (what comes
back) are properties of the route, applied by one wrapper and held by a test.

Decorators were the first idea. TypeScript's decorate class members, and the Worker has no classes: a route is an
object in a table. A decorator around a handler would also see only the request and the status, which makes a request
log ("PUT /api/members/3"), not a record ("Reg: roles Member → Helper, Member").

## Decision

- **Every route that isn't a GET declares `audit`**: what it puts on the record, or `false` for nothing. A test fails
  on any that doesn't, the same way it does for `changes`, so the choice is made on purpose for each new route.
- **A declaration is data**: an `event` name, a `subject` (one read of the thing the change is to: a member's standing,
  a role's actions, a sign-in email) and optionally `about` (the member or role, by id, for the page to name).
- **The wrapper does the rest** (`handleApi`): it reads the subject before the handler and after it, and when the two
  differ writes one entry with who did it, `from`, `to` and `about`. A refused or failed change writes nothing; a
  change that changes nothing (the same roles saved again) writes nothing.
- **Readers live with their domain** (`memberStanding`, `roleSummary` in people.ts; `sessionSignups` in teams.ts;
  `draftProgress` in draft.ts; `tournamentSummary` in schedule.ts), so "what does this change touch" is answered once.
- On the record now: `member.updated` (status, roles), `member.email`, `member.added`, `member.quarterly`,
  `role.created`, `role.updated`, `dev_mail.changed`, `tournament.deleted`, `session.reset`, `draft.reset`; and,
  from the wrapper itself, `refused`.
- **Not declarative, and staying that way:** sign-in's own events (`sign_in`, `sign_out`, `sign_in.capped`,
  `access.requested`). Sign-in routes run before anyone is known and aren't in the route table; their events are what
  happened, not a change to compare.

## Consequences

- Adding a route means deciding its record in the same place as its permission. Forgetting is a failing test.
- A subject is read twice per audited change: two small indexed reads, on the few routes that change who can do what.
- A subject must read the same way both times; one that includes a timestamp or order that drifts would record
  changes that didn't happen. The readers sort what they return.
- The page says each event in plain words (`AuditLog.svelte`); an event it doesn't know still shows, as its name and
  detail.
