# Archive

`team-manager/` is the original Friday-session team picker (Next.js + Airtable + Python LP solver on Fly.io).
It is **not maintained or deployed**. It's kept as a reference while the features are rebuilt on the new stack
(see docs/roadmap.md, phase 3):

- Data model: `team-manager/lib/airtable.ts` (players, sessions, attendance, teams)
- Team-balancing solver: `team-manager/lib/solver_lp.py`, and its browser-side JavaScript port in
  `.github/kb/js-solver-port.md` (glpk.js; no server needed, so no cost)
