# 0008. Admin login by email magic link

- **Status:** Superseded by [0023](0023-device-bound-sign-in.md)
- **Date:** 2026-10-05 (decided at project start)

## Context

A handful of club volunteers need to log in to the ops app (attendance, payments, Kumite scoring). They
won't manage passwords well, and we won't pay for an identity provider.

## Decision

Admins log in with a one-time link emailed to an allow-listed address. Tokens are hashed, single-use and
expire after 15 minutes; the session is a signed cookie.

## Consequences

Login depends on email delivery (planned: the Gmail API, then a transactional sender once there is a domain). No passwords
to reset or leak.
