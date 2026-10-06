# 0023. Everyone signs in with a device-bound email code or link, or Google

- **Status:** Accepted. Supersedes [0008](0008-magic-link-admin-login.md). Amended by
  [0035](0035-sessions-are-hashed-tokens.md): the session is a hashed random token with no signing key, and the email
  carries a code only, no link.
- **Date:** 2026-10-06

## Context

[0008](0008-magic-link-admin-login.md) planned a magic link for a few admins. Now every member signs in, mostly
from a phone, often from the installed PWA. Two problems with a plain magic link:

- On iPhone the link opens Safari, not the installed app, so the member ends up signed in in the wrong place.
- A link (or a code) can be forwarded, and whoever opens it is signed in.

We won't manage passwords or pay for an identity provider ([0003](0003-free-tiers-only.md)).

## Decision

- A member enters their email. The Worker sets a private, httpOnly **nonce cookie** on that device and emails a
  **6-digit code** and a **link**. Either signs them in, but only alongside the nonce cookie: a forwarded link or
  code fails on another device ("open this on the device you signed in from").
- Codes and link tokens are stored hashed, are single-use, expire after 15 minutes, and allow 5 wrong attempts.
  They're only sent to the email on the member's own account; an unknown email gets the same reply, so the form
  doesn't reveal who's a member.
- **Sign in with Google** (OAuth with PKCE) is a shortcut for a member whose verified Google email matches.
- The session is an HMAC-signed cookie lasting about 6 months, renewed while in use, backed by an
  `auth_sessions` row so an admin can sign someone out.
- Email goes through the Gmail API from batterseahockey@gmail.com (`shared/email.ts`), which the website's enquiry
  email also uses.
- New people **request access**; an admin approves them ([0024](0024-action-based-authorization.md)).

## Consequences

- Works in the PWA, in a browser and in a future store app the same way: type the code.
- Sign-in depends on email delivery (and on Google for the shortcut).
- New secrets: the session key, the Gmail OAuth client and refresh token, the Google sign-in client.
