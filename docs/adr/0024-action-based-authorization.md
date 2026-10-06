# 0024. Permissions are actions; roles are data built from actions

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The team app starts with three kinds of user (member, contributor, admin), but the club will want others: someone
who does the door register, a Kumite scorekeeper, a treasurer who sees dues but can't edit the website. Hard-coding
roles means a code change for each.

typesmiths/decohere checks `verb:Subject` actions (CASL style), declared on every route, failing closed, with an
admin wildcard (`manage:all`). Its roles live in Auth0. We have no identity provider, so ours live in D1.

## Decision

- **Actions are code.** `team/app/src/access/actions.ts` is the catalog: each action (`verb:Subject`) with a
  plain-English label for the admin screen. For example: `read:Event`, `create:Event`, `update:Event`,
  `signup:Event`, `record:Attendance`, `generate:Teams`, `publish:Teams`, `manage:Fees`, `record:Payment`,
  `read:Dues`, `score:Match`, `run:Draft`, `pick:Draft`, `upload:Photo`, `upload:Video`, `publish:Media`,
  `read:Rating`, `manage:Member`, `manage:Role`, `edit:Content`, and `manage:all` (everything).
- **Every API handler and page declares what it needs**: an action, `authenticated` (signed in) or `anonymous`. The
  API wrapper denies anything else. A test fails if a route declares nothing or names an action not in the catalog.
- **Roles are data**: `roles` (name, description, `is_system`), `role_actions`, `member_roles`. A member can do the
  union of their roles' actions. Actions in the database that are no longer in the catalog are ignored.
- **Seeded roles**: Member (events, sign-up, own profile and tab), Contributor (Member plus uploads), Admin
  (`manage:all`, can't be edited or deleted). Admins create other roles by ticking actions.
- **Some checks also look at the record**: `pick:Draft` only for that draft's captains; a profile only by its owner
  or `manage:Member`.
- `/api/me` returns the member's actions. Nav entries and buttons declare an action and hide when it's missing; the
  server still checks.
- The last member holding `manage:all` can't lose it. Role changes, permission changes and refused requests go in
  `audit_log`.
- Permissions are read with one indexed query per request. The first admin's email is a non-secret setting.

## Consequences

- New kinds of helper need no code change, only a role.
- Every new route needs an action, and every new action a label; the test enforces it.
- Mistakes in role setup are possible; the audit log and the last-admin guard limit the damage.
