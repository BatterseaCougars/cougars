# 0029. Enquiries are deleted after 12 months

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

UK GDPR expects the privacy notice to say how long personal data is kept, and the club to keep it no longer. The
"Try a session" form stores a name, email and optional phone and message in D1 (`enquiries`), and each enquiry is
emailed to the club inbox ([ADR 0027](0027-email-through-gmail-api.md)). The club chose 12 months on 2026-10-06.

## Decision

- Enquiries are deleted 12 months after they're sent, unless the person joined (`status = 'joined'`). The privacy
  page says so.
- The rule is one SQL file, `db/retention/expire-enquiries.sql`, run by `deploy.yml` after the migrations on every
  deploy. Production deploys daily (the daily rebuild, [ADR 0018](0018-rebuilds-until-team-app.md)), so it runs daily
  there. A test runs the same file against the test database.
- The copies in the club's Gmail (the enquiry emails and auto-replies) are deleted by hand once a month: the website's
  Gmail access can only send. The steps are in docs/editing.md.

## Consequences

- No Worker cron or extra service. If production stopped deploying daily, deletion would pause until the next deploy.
- Nothing sets `joined` yet, so every enquiry goes after 12 months; the team app will mark joiners when it turns
  enquiries into members.
- Changing the period means changing the SQL file, the privacy page and this record together.
