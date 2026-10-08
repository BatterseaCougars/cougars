# 0067. One goalie a team in a draft

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

The Kumite plays one goalie a side. Goalies sign up like anyone else, so a draft could hand one team two goalies and
leave another with none, and nothing on draft night stopped it.

## Decision

- In a captains' draft a team has **at most one goalie** (`members.position = 'G'`), counting its captain.
- It holds for every way onto a team: a captain's pick, a pick made by whoever runs the draft, and an admin putting
  someone on a team directly (ADR 0066). A second goalie is refused with "They've got a goalie already."
- It doesn't hold for teams that enter whole (`kind: "teams"`): they bring their own side.
- The Draft page shows it: goalies are their own filter in the player list, a captain's team shows its D/F/G count,
  and a goalie's row has no Pick once your team has one.

## Consequences

- With fewer goalies than teams, the last teams go without; the page says so, which is a reason to take one early.
- A team whose goalie drops out gets a replacement through the admin's team edit, once the first has come off.
