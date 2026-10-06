# 0029. Admins can view the app as a member, read-only

- **Status:** Accepted
- **Date:** 2026-10-06
- **Builds on:** [0024](0024-action-based-authorization.md)

## Context

Roles are data ([0024](0024-action-based-authorization.md)), so what a member sees depends on roles an admin
configured. The only reliable way to check a role, or to answer "I can't see my team", is to see the app exactly
as that member does.

## Decision

- A new action, `impersonate:Member` ("View the app as a member"). Admins have it through `manage:all`; it can be
  given to other roles.
- The account badge offers **View as a member…**. Picking someone makes the app show their data with their
  actions: their Home, their team, their tab, only the pages their roles allow.
- **Read-only.** While viewing as someone you can't change anything as them: the API refuses every write on an
  impersonated session except ending it, and the app disables the controls (In/Out, profile, sign out).
- An amber banner across the top says who you're viewing as, with **Back to <you>** always available, whatever
  the member's own permissions. The badge turns amber too.
- The session holds both members: who you are (for the audit log and for ending it) and who you're viewing as
  (for permissions and data). Starting and ending go in `audit_log`.

## Consequences

- Admins can check roles and support members without asking for their phone.
- Every write path must check for an impersonated session; the API wrapper does it once, centrally.
- Admins can see members' tabs and profiles this way, which they can already see under Settings.
