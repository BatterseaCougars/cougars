// The app's working copy of the club's data, filled from D1 (demo/data.ts hydrate) and replaced by
// app/backend.svelte.ts after each change. Sign-ups, teams, quips and dues still live here only: their tables come
// in later milestones (docs/roadmap/team-app.md).
import { londonToday } from "../lib/dates";
import type { Charge } from "../lib/dues";
import { QUIPS } from "../lib/quips";
import type { Team } from "../lib/snake";
import { FEES, MEMBERS, ONE_OFFS, ROLES, SERIES, SESSIONS, TOURNAMENTS, TOURNAMENT_TYPES } from "./data";

export const db = $state({
  series: structuredClone(SERIES),
  sessions: structuredClone(SESSIONS),
  tournamentTypes: structuredClone(TOURNAMENT_TYPES),
  tournaments: structuredClone(TOURNAMENTS),
  oneOffs: structuredClone(ONE_OFFS),
  roles: structuredClone(ROLES),
  members: structuredClone(MEMBERS),
  fees: structuredClone(FEES),
  quips: structuredClone(QUIPS),
  /** Published teams, by session id. */
  teams: {} as Record<number, Team[]>,
  /** One person for one session or tournament, paid or not (ADR 0032). */
  charges: [] as Charge[],
});

/** Mark a charge paid (transfer or cash), or take it back. */
export function markPaid(chargeId: number, via: "transfer" | "cash") {
  const c = db.charges.find((x) => x.id === chargeId);
  if (c) Object.assign(c, { paidOn: londonToday(), paidVia: via });
}
export function markUnpaid(chargeId: number) {
  const c = db.charges.find((x) => x.id === chargeId);
  if (c) Object.assign(c, { paidOn: null, paidVia: null });
}
