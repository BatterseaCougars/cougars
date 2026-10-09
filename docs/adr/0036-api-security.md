# 0036. Every API response sends only what that caller may see, decided on the server

- **Status:** Accepted. Extends [0024](0024-action-based-authorization.md). Amended by
  [0092](0092-security-headers-from-the-asset-layer-too.md): the headers come from the asset layer too, with a
  content security policy; and by [0099](0099-bootstrap-sends-only-your-own.md): of anything personal, only your own.
- **Date:** 2026-10-06

## Context

A security review of the team app's API (2026-10-06), done before sign-in went live, found that the UI was doing
some of the server's job:

- `/api/bootstrap` sent every signed-in member every member's email and payment reference, plus the names and
  emails of strangers asking to join. The screens hid them, but devtools showed them.
- Anyone who could manage members could make themselves Admin. Anyone who could manage roles could add
  `manage:all` to a role they held.
- Forms on another site could post to the API wherever `SameSite=Lax` cookies let them through: from a sibling
  subdomain, or as `text/plain`.

The repo is public and members' details are personal data ([0033](0033-personal-data-out-of-the-repo.md)). Once
real people sign in ([0023](0023-device-bound-sign-in.md)), anything the API sends is effectively published to
whoever receives it.

## Decision

**Every route is designed for its least trusted caller.** The UI hiding something is never the protection.

- **Rows and fields are filtered on the server, per caller.** A response holds only what the caller's actions allow.
  Anything personal (email, phone, payment reference, rating) is sent only to its owner or to whoever holds the
  action for it. A new field or route starts private and is opened up deliberately.
  - Bootstrap, for anyone without `manage:Member`:
    - active members only;
    - their own email, phone and payment reference only;
    - ratings only with `read:Rating`.
- **You can't grant what you don't have.** Only `manage:all` may give out any action. Anyone else may:
  - give a member only roles whose actions they hold themselves;
  - create or change only roles whose old and new actions they hold;
  - change a member (their details, roles, status or sign-in email) only if that member can do nothing they can't.

  So a member manager can't make an admin, demote one, or take over an admin's account by changing its email.

- **Changes come only from the app's own pages.** Every POST, PUT and DELETE must have an `Origin` header equal to
  the app's own origin (or `Sec-Fetch-Site: same-origin` when there's no Origin), and only JSON bodies are
  accepted. GET requests change nothing (bootstrap's adding of future sessions is idempotent).
- **Security headers on every response:**
  - `frame-ancestors 'none'` and `X-Frame-Options: DENY`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: same-origin`.
- **Tests prove it** (`team/app/worker/security.test.ts`):
  - every route refuses someone who isn't signed in (401);
  - every route refuses a member whose role lacks its action (403);
  - bootstrap as a plain member holds nothing private but their own;
  - the grant rules hold;
  - other sites' requests and non-JSON bodies are refused.

  A new route is covered by the first two tests automatically. A new private field needs its own assertion.

## Consequences

- Each new route asks, for every field and row it returns: who is this for?
- Admin-only screens get their data from the server only when the caller may see it. A screen showing an empty
  value for someone else's email is the server working, not a bug.
- Payment references follow the member's id (`COU-0001`), so they aren't secret. They're still sent only to the
  member and to managers.
- When dues move to D1 ([0026](0026-dues-ledger.md)), they're gated on the server (`read:Dues`, `record:Payment`)
  from the start.
- "View as a member" ([0029](0029-view-as-a-member.md)) is still client-side, so an admin's preview holds admin
  data. If it ever needs to be exact, it moves to the server and becomes read-only there.
