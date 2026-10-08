# 0077. Dev tools, and who gets their own email outside production

- **Status:** Accepted. Amends [0027](0027-email-through-gmail-api.md)'s rule that nothing outside production reaches
  a real person.
- **Date:** 2026-10-08

## Context

Outside production every email goes to one safe inbox (the dev sending account, or `MAIL_SAFE_TO`). That keeps dev
from emailing members, but it also means nobody can sign in on dev with their own inbox: the code goes to the dev
account. Changing a secret to fix that needs a deploy each time.

## Decision

- **Outside production, some people get their own email:** every active Admin (so they can sign in and get to Dev
  tools), plus a list kept in the database (`dev_mail_recipients`). `safeMail` (shared/email.ts) sends an email to its
  real recipients only when every one of them is allowed; otherwise the whole email goes to the safe inbox, as
  before. The club's own inbox is never allowed.
- **Settings → Dev tools**, a page that exists only outside production, for whoever has `manage:Settings`: add and
  take off addresses; it takes effect at once. The bootstrap says whether it's there (`devTools`).
- **In production none of this exists:** the routes answer 404, and the list is never read; real recipients always
  get their email there, as they always have.
- Applies to the team app's emails (sign-in codes, invites, usage warnings). The website's emails still use the safe
  inbox only.

## Consequences

- Dev's data becomes production's at launch (ADR 0050); the list comes with it but is ignored there.
- An admin on dev can make dev email a real person, by adding them. That's the point; it's limited to admins.
