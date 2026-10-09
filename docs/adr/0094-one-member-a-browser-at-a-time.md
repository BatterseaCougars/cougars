# 0094. A browser holds sign-in codes for one member at a time

- **Status:** Accepted. Amends [0035](0035-sessions-are-hashed-tokens.md).
- **Date:** 2026-10-09

## Context

[0035](0035-sessions-are-hashed-tokens.md) decided "one browser, any of its codes": a browser keeps its nonce while
it asks again, so any code it asked for in the last 15 minutes works there. The guess limits (5 wrong codes per
code, 20 a day per member) are counted on the newest live code under that nonce, and the daily cap is checked for
that code's member.

A security review (2026-10-09) found the accounting slips when one browser holds codes for two accounts. Someone
asks for a victim's code, then for their own: guesses at the victim's code are now counted against their own
account's code and daily cap, and when that code's five are spent the next one in line takes over. The odds stay
negligible (a million codes, 15 minutes, ten codes a day), but the rule the ADR promises wasn't the rule in force.

## Decision

- **Asking for another member's code starts a fresh nonce.** `/api/auth/start`, finding live codes under this
  browser's nonce for a different member, issues a new nonce cookie; the earlier member's codes die with the old
  one. So every live code under a nonce is one member's, and every guess and every cap is that member's.
- Asking again for the _same_ member keeps the nonce and all its codes, as [0035](0035-sessions-are-hashed-tokens.md)
  intended.

## Consequences

- The limits mean what the ADR says: 5 wrong per code, 20 a day per member, whoever is typing.
- Two people sharing one browser to sign in one after the other each get their own code; the first's code stops
  working once the second asks, which is what they'd expect.
