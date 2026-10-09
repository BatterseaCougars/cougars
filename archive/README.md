# Archive

`team-manager/` is the original Friday-session team picker (Next.js + Airtable + Python LP solver on Fly.io).
It is **not maintained or deployed**. It's kept as a reference while the features are rebuilt on the new stack
(see the team app in `team/app`):

- Data model: `team-manager/lib/airtable.ts` (players, sessions, attendance, teams)
- Team-balancing solver: `team-manager/lib/solver_lp.py` (the team app balances teams its own way,
  [ADR 0102](../docs/adr/0102-balanced-teams-by-swap-search.md))
