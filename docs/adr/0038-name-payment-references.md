# 0038. A member's bank reference is their name: COUGARS ADRIAN K

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Every member pays by bank transfer quoting their own fixed reference ([0026](0026-dues-ledger.md)). It was built
from their id, `COU-0004`: unique, but a number nobody remembers, and on the bank statement the treasurer has to
look it up to know who paid. UK bank references hold 18 characters, letters, digits and spaces, and banks show
them in capitals.

## Decision

We will make the reference `COUGARS`, the member's first name and their surname's initial: `COUGARS ADRIAN K`.

- Accents are dropped and letters a bank won't take are spelled out (Ł → L, ß → SS); anything else goes.
- The first name is cut to leave room for a clash digit, so the reference always fits in 18 characters.
- A second person with the same first name and initial gets the next digit, `COUGARS SAM T2`, up to 9; past that,
  `COUGARS` and their id.
- It's set once, when the member is made (the join request or the roster seed), and never changed after, not even
  when their name is edited: it's what their standing order quotes.

`shared/payment-reference.ts` holds the rules and the SQL, used by both the Worker and the roster seed. Migration
0012 clears the old `COU-` references; the seed gives the club's players new ones on the same deploy, and anyone
else gets theirs the next time they sign in. Nobody had paid with a `COU-` reference: the team app wasn't live.

## Consequences

- The treasurer can read who paid off the statement without looking anything up.
- A reference shows a first name and an initial to whoever sees the payer's or the club's statement. That's no more
  than the payer's own name, which the bank shows beside it anyway.
- Two people can look alike (`SAM T` and `SAM T2`), so the treasurer still matches by the whole reference, never by
  the name in it.
- A reference doesn't follow a name change. If someone wants theirs changed, that's an edit by hand, and they must
  update their standing order.
