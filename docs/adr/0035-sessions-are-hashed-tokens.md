# 0035. Sessions are random tokens stored hashed, and sign-in is a code with no link

- **Status:** Accepted. Amends [0023](0023-device-bound-sign-in.md). Amended by
  [0093](0093-local-only-switches-need-a-private-address.md) (the local switches need a private address) and
  [0094](0094-one-member-a-browser-at-a-time.md) (a browser's codes are one member's).
- **Date:** 2026-10-06

## Context

[0023](0023-device-bound-sign-in.md) planned an emailed code or link, and said the session would be an HMAC-signed cookie backed by an `auth_sessions`
row, which needs a signing key (`TEAM_SESSION_SECRET`). Every request already looks the session up in D1, so that
an admin can sign someone out and an inactive member is shut out at once. With that lookup, a signature adds
nothing: the row decides.

Local dev also needs a way to sign in when nothing is emailed from a laptop.

## Decision

- The session cookie holds a **random 256-bit token**. D1 keeps only its SHA-256 hash, as it does for the nonce and
  the code (`0008_team_sign_in.sql`). There is no signing key and no `TEAM_SESSION_SECRET`.
- The session lasts 180 days. Its expiry moves on at most once a day while it's used, so most requests read and
  don't write. Revoking the row, or making the member inactive, ends it on the next request.
- Cookies: `cougars_session` and `cougars_nonce` (15 minutes), both `HttpOnly`, `SameSite=Lax` and `Path=/`. On
  https they're `Secure` and named with the `__Host-` prefix, so no sibling subdomain can set or shadow them.
- **One browser, any of its codes.** A browser keeps its nonce while it asks again, so any code it asked for in the
  last 15 minutes works there, and using one spends all of them. Codes still work only in that browser, so a
  forwarded email signs no one in.
- **Guesses are counted before they're checked**, in one statement, and a code is spent the same way, so requests
  sent all at once can't get extra tries or two sessions. The limits:
  - 5 wrong codes per code;
  - 5 codes an hour and 10 a day per member;
  - 20 wrong codes a day per member, after which no codes are sent or accepted until the day has passed (logged as
    `sign_in.capped`);
  - per address, best effort: 10 code requests in 10 minutes and 5 requests to join an hour;
  - asking to join stops while 50 people are waiting.
- **A code, no link.** [0023](0023-device-bound-sign-in.md) planned a link alongside the code. It's dropped. On an
  iPhone an installed web app keeps its sign-in apart from every browser, and a link in an email always opens a
  browser, so the link could never sign in the app most members use. The email carries just the code.
- **Local dev** (`vite`, `TEAM_ENV=local`) signs in the same way. Nothing is emailed there, so the code comes back
  to the screen. `TEAM_AUTO_ADMIN=1` in the shell skips sign-in and makes you the first admin, for screenshots
  and tests. A build carries neither setting.

## Consequences

- One fewer secret to create, rotate and document.
- One way to sign in, the same on every phone and computer: copy the code from the email into the app.
- A stolen database can't sign anyone in, because it holds only hashes. A stolen cookie works until the session
  is revoked or the member is made inactive, the same as with a signed cookie.
- Each API request makes one indexed D1 read for the session, which is well inside the free tier for a club.
