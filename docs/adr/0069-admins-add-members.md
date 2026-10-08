# 0069. An admin adds a member, and the app emails them a link to itself

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

Someone new could only get into the app by asking to join on the sign-in screen, then waiting for an admin to
approve them, and nobody told them when they were in. An admin who'd just met a new player at training had no way
to add them.

## Decision

- **Teammates has Add member** (`manage:Member`), a sheet over the page ([ADR 0065](0065-admin-actions-where-the-thing-is.md)):
  name, email, position. `POST /api/members`. They're `active` at once, with a payment reference, like an approved
  request. An email already in the club is refused (409).
- **The app emails them** a short welcome with a link to itself, `<origin>/?email=<their address>`; the sign-in screen
  fills the address in from it, so they send themselves a code and they're in ([ADR 0023](0023-device-bound-sign-in.md)
  unchanged: the link signs nobody in by itself). Sent through Gmail like the codes ([ADR 0027](0027-email-through-gmail-api.md)),
  so outside production it goes to the safe address.
- **The email failing doesn't undo the add.** The reply says `emailed: false` and the admin is told to send the link
  themselves.

## Consequences

- No new secret or service: the same Gmail sender, inside its free quota.
- Approving someone who asked to join still sends nothing; it could send the same email.
