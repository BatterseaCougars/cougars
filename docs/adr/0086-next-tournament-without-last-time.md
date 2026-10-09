# 0086. The next tournament's page says less, and leaves the last one to History

- **Status:** Accepted. Amends [0074](0074-tournament-home-in-three-acts.md).
- **Date:** 2026-10-08

## Context

ADR 0074's "before" act had a lede ("It's on. Sign-up opens nearer the day…"), a hint under the teams ("Not final
till the day: names, logos and squads can still change"), a "Captain X" line under every "Team X", and **Last time**,
the last champions. The page read as a lot of words, some of them saying the same thing twice, and the lede could
contradict the sign-up line under it. The draft's captains were a comma list that ran together.

## Decision

- **Once the next one is set (even with its date to come), Last time goes.** The last one is in History, a tab away.
- **No lede, no "not final" hint.** The sign-up line says where sign-up stands, including "Sign-up opens nearer the
  day" before it opens.
- **The teams are "Teams"**, each with its crest and name; a line under only when it adds something ("Your team", or
  its captain once the team has its own name).
- **The draft card shows its captains as discs**: initials in their team's colour (as its crest), the name on hover
  and for a screen reader, a ring on yours. The section title above it is gone; the card says "Draft …" itself.

## Consequences

- The before act is the sign-up line, the draft, the teams and the first fight, nothing else.
- `previousTournament` is no longer used by the series page; History still lists every past one.
