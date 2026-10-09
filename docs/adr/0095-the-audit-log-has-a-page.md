# 0095. The audit log has a page, and says things in plain words

- **Status:** Accepted. Extends [0024](0024-action-based-authorization.md). Amended by
  [0098](0098-changes-declare-their-record.md): a change declares its record on its route, and the wrapper writes it.
- **Date:** 2026-10-09

## Context

[0024](0024-action-based-authorization.md) promised that role changes, permission changes and refused requests go
in `audit_log`, and [0023](0023-device-bound-sign-in.md) put sign-ins there. Until the security review of
2026-10-09 only sign-ins, sign-outs and capped sign-ins were written; the review added the rest (member and role
changes, sign-in email changes, added members, the dev mail list, every 403). Nothing read the table: an admin
wanting to know who gave someone a role, or who kept poking at admin routes, had to query D1 by hand.

## Decision

- **A new action, `read:Audit`** ("See the audit log"). Admins hold it through `manage:all`; it can be given to a
  role like any other.
- **`GET /api/audit`** returns the newest entries first, a page at a time (`before=<id>` for the next page, up to
  200 a page). Each entry names who acted and, where its detail names a member or a role, that one by its current
  name, so the page needs no other data to say what happened.
- **Settings → Audit log**, under Security: one line per entry, by day, in plain words ("Dana changed Reg: roles
  Member → Helper, Member", "Pat was refused GET /api/usage: needs \"See the club's free Cloudflare
  allowance\""). Refusals and capped sign-ins stand out. "Earlier" reads the next page.
- **What's written** (`worker/audit.ts`; since [0098](0098-changes-declare-their-record.md), declared on each route): `sign_in`, `sign_out`,
  `sign_in.capped`, `access.requested`, `member.added`, `member.updated` (status or roles, only when they changed),
  `member.email`, `role.created`, `role.updated`, `dev_mail.added`, `dev_mail.removed`, `refused`. Each carries
  `memberId` or `roleId` where it's about one, and before and after where something changed.
- Writing stays an explicit call at each place something changes who can do what. Logging every route centrally
  was considered and is left for when the list of events grows past what a reader can scan.

## Consequences

- An admin can answer "who did this?" from their phone, and sees attempts at admin routes without being told.
- A new kind of change to who can do what needs an `audit()` call and a line in the page's `said()`; an unknown
  action still shows, as its name and detail, so nothing is silent.
- The log holds names and emails (a changed sign-in email, an added member's). It's behind `read:Audit`, and the
  table is personal data like the rest of D1 ([0033](0033-personal-data-out-of-the-repo.md)).
