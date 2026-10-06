# 0027. Email goes through the Gmail API, and only production reaches real people

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

The club should hear about each "Try a session" enquiry by email. The club can't spend money and has no Google
Workspace: its inbox is the consumer account batterseahockey@gmail.com, and until 2026-10-06 there was no domain.
The free options (researched 2026-10-06): Cloudflare Email Routing only sends to verified addresses; Resend, Brevo
and MailChannels need a domain; Cloudflare's outbound Email Service needs Workers Paid; SMTP from Workers was
unreliable for Gwenda, who moved to the Gmail API.

Gwenda (gwenda-hackney/ark) also learned that a non-production environment must never email a real person, and
that the environment check must fail safe.

## Decision

- Email is sent with the **Gmail API** over HTTPS (`shared/email.ts`, for the website and the team app), authorised
  by an **OAuth refresh token** with the send-only scope, from the club's Google Cloud project _Battersea Cougars_
  (owned by the developer account cougars.dev). Setup and the four secrets: [README.md#gmail](../../README.md#gmail).
- **Two sending accounts.** Production sends as batterseahockey@gmail.com; dev sends as cougars.dev@gmail.com.
  `scripts/gmail-auth.mjs` refuses the club account for dev and any other account for production, and the club's
  token lives only in the `cougars` Secrets Manager project.
- **Only production reaches real people** (`safeMail`, run on every send):
  - production means `SITE_ENV` is exactly `production`, set only by `target.mjs` on `release`; `wrangler.jsonc`
    defaults to `dev`;
  - anywhere else, every recipient is replaced by `MAIL_SAFE_TO`, or the sending account itself (dev sends to
    cougars.dev), with the real recipients in the subject and `X-Cougars-Original-To`;
  - the club's inbox is refused as the safe address, and as the sending account, outside production;
  - with no Gmail secrets (a laptop, tests) the email is logged, not sent.
- The enquiry is saved first; the email goes out after the response (`waitUntil`). A failed email is logged and
  never loses the enquiry.

## Consequences

- Free, about 500 emails a day, no domain needed, and replies go from an address members know.
- The app is unverified (Google warns on the consent screen), which is fine for two accounts. It must stay
  **In production** in Google Auth Platform: in Testing, tokens expire after 7 days.
- A password change on a sending account, removing its access, or 6 months unused cancels its token: emails
  then fail (logged as `enquiry.email_failed`) until `gmail-auth.mjs` is re-run. Enquiries are still saved.
- Once there's a domain, the club notification could move to Cloudflare Email Routing and auto-replies to Resend,
  behind the same `sendMail`.
