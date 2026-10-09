# 0089. A tournament's sign-up opens on a day

- **Status:** Accepted. Amends [0087](0087-next-tournament-in-three-questions.md).
- **Date:** 2026-10-09

## Context

Sign-up was a status an admin set by hand ("Sign-up open"). Scheduling the next Kumite in three questions left it
"Coming up", saying "Sign-up opens nearer the day" until someone remembered to open it.

## Decision

- **A tournament has a day sign-up opens** (`signup_opens_on`). From that day (London) members can say they're in,
  until the end of the closing day. An admin can still open it by hand (status "Sign-up open").
- **One rule, shared** by the app and the Worker (`lib/signup.ts`, `signupOpen`): open by hand, or planned and past
  its opening day; never after its closing day. The Worker refuses an early "in" with the day it opens.
- **Scheduling asks for it**: the quick form's second question, "When does sign-up open?", defaulting to today; the
  full editor has it on Sign-up, beside the closing day. It can't be after the tournament's day, and sign-up can't
  close before it opens.
- Before it opens, the page says "Sign-up opens Fri 16 Oct".

## Consequences

- Nobody has to remember to open sign-up; the status stays "Coming up" and the opening is worked out from the day.
- Tournaments made before this have no opening day, so they wait for an admin as before.
