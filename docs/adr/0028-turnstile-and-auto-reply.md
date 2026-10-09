# 0028. Auto-replies only to people Turnstile verified, and capped

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The "Try a session" form should send the enquirer an automatic reply with the session details. That email goes to
whatever address is typed in, from the club's Gmail account ([ADR 0027](0027-email-through-gmail-api.md)). A bot
could use it to make the club email strangers (form relay abuse, "backscatter"): recipients mark it as spam, the
club's mail starts landing in spam, and Gmail can suspend the account, which is also the club's public contact.

The form's existing defences don't separate people from scripts: the honeypot and validation stop only careless
bots, the per-IP rate limit is beaten by rotating addresses (and is off on workers.dev), and Astro's origin check
stops cross-site request forgery, not scripts. A session or signed token proves only that the page was fetched first.
The form must still work without JavaScript.

## Decision

- **Cloudflare Turnstile** (free, unlimited, no cookies) on `/join`. The server checks its token once with
  Cloudflare (`lib/server/turnstile.ts`) and saves the answer on the enquiry (`enquiries.verified`). One widget per
  Cloudflare account: dev's workers.dev address, and batterseacougars.com.
- A failed or missing check (a bot, or JavaScript off) **doesn't block** the enquiry: it's saved and the club is
  emailed, with a note that no automatic reply went out. The club answers those by hand.
- **The auto-reply** (`lib/server/auto-reply.ts`) goes only to verified enquiries, and only within **caps**, whatever
  gets past Turnstile: at most 20 a day across the site, and one per address per 7 days (`auto_replied_at`).
- It repeats nothing the sender wrote except a first name that looks like a name (otherwise "there"), and states only
  the site's facts from the Studio (session day and times, venue, kit notes). Replies go to the club inbox.

## Consequences

- Worst case, a determined spammer (for example with a paid captcha-solving service) makes the club send 20 harmless
  emails a day. Raising the caps is a code change.
- The club's notification email says whether the person has had the automatic reply.
- Two new secrets (`TURNSTILE_SECRET_KEY`, `__PRODUCTION`) and two public site keys in `deploy.yml`. Without the
  secret, nobody counts as verified and no auto-replies are sent; enquiries and the club's email carry on.
- The privacy page mentions Turnstile and the confirmation email.

## History

- 2026-10-06: Auto-replies only to people Turnstile verified, and capped.
