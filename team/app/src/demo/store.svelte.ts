// The demo's in-memory "database": changes last until reload. D1 replaces it from T1.
import { londonToday } from "../lib/dates";
import { feeOn, type Charge } from "../lib/dues";
import { addDays, datesToMake, ruleDates } from "../lib/recurrence";
import { QUIPS } from "../lib/quips";
import type { Team } from "../lib/snake";
import { FEES, MEMBERS, ONE_OFFS, ROLES, SAMPLE_SIGNUPS, SERIES, TOURNAMENTS, TOURNAMENT_TYPES } from "./data";
import type { TrainingSeries, TrainingSession } from "./model";

export const db = $state({
  series: structuredClone(SERIES),
  sessions: [] as TrainingSession[],
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

let nextSessionId = 1;

/**
 * Make the sessions a series' rule calls for (a daily Cron Trigger in D1). After a rule change, future sessions the
 * rule no longer makes go, unless someone has signed up or an admin has touched them (moved, cancelled): those
 * stay, for an admin to deal with. A paused series makes no new sessions.
 */
export function syncSessions(series: TrainingSeries, today = londonToday()) {
  // A lookup built and read here, never kept: a plain Set is right.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  const ruleMakes = new Set(datesToMake(series, [], today));
  db.sessions = db.sessions.filter(
    (s) =>
      s.seriesId !== series.id ||
      s.heldOn < today ||
      Boolean(s.movedFrom || s.cancelledAt) ||
      s.going.length + s.waitlist.length > 0 ||
      (series.active && ruleMakes.has(s.heldOn)),
  );
  if (!series.active) return;
  const existing = db.sessions.filter((s) => s.seriesId === series.id);
  for (const heldOn of datesToMake(series, existing, today)) {
    db.sessions.push({ id: nextSessionId++, seriesId: series.id, heldOn, going: [], waitlist: [] });
  }
  db.sessions.sort((a, b) => a.heldOn.localeCompare(b.heldOn));
}

for (const series of db.series) syncSessions(series);
// Sample sign-ups on the first series' next two sessions
db.sessions
  .filter((s) => s.seriesId === db.series[0].id)
  .slice(0, SAMPLE_SIGNUPS.length)
  .forEach((s, i) => (s.going = [...SAMPLE_SIGNUPS[i]]));

// ─── Past sessions and dues (sample) ───
// Sixteen weeks of Fridays and four Sundays already held: who came, the fee on the night, and a charge for each
// pay-as-you-go player. Older ones are mostly paid; a few aren't, so every column of Overdue Rentals has someone.

const payg = new Set(
  MEMBERS.filter((m) => m.status === "active" && m.plan === "Pay as you go").map((m) => m.player.id),
);
let nextChargeId = 1;

function charge(memberId: number, kind: Charge["kind"], refId: number, pence: number, dueOn: string, paid: boolean) {
  db.charges.push({
    id: nextChargeId++,
    memberId,
    kind,
    refId,
    pence,
    dueOn,
    paidOn: paid ? addDays(dueOn, 3 + (memberId % 5)) : null,
    paidVia: paid ? (memberId % 3 ? "transfer" : "cash") : null,
  });
}

{
  const today = londonToday();
  const past: TrainingSession[] = [];
  for (const [series, weeks] of [
    [db.series[0], 16],
    [db.series[1], 4],
  ] as const) {
    if (!series) continue;
    const dates = ruleDates(series, addDays(today, -weeks * 7), addDays(today, -1));
    dates.forEach((heldOn, w) => {
      const players = MEMBERS.filter((m) => m.status === "active")
        .map((m) => m.player.id)
        .filter((id) => id === 1 || (id * 7 + w * 3 + series.id) % 5 !== 0)
        .slice(0, series.capacity ?? 99);
      const feePence = feeOn(series.fees, heldOn);
      const session: TrainingSession = {
        id: nextSessionId++,
        seriesId: series.id,
        heldOn,
        going: [...players],
        waitlist: [],
        attended: players,
        feePence,
        registerClosedAt: `${heldOn}T21:45:00Z`,
      };
      past.push(session);
      const age = dates.length - w; // weeks ago
      for (const id of players) {
        if (!payg.has(id)) continue;
        // The longer ago, the likelier it's been paid; a stubborn few never do.
        const paid = id === 1 ? age > 2 : (id + w) % 7 === 0 ? false : age > 3 || (id + w) % 3 !== 0;
        charge(id, "session", session.id, feePence, heldOn, paid);
      }
    });
  }
  db.sessions = [...past, ...db.sessions];
  // Finished tournaments: every entrant pays the edition's fee.
  for (const t of db.tournaments.filter((x) => x.status === "finished")) {
    const entrants = MEMBERS.filter((m) => m.status === "active").map((m) => m.player.id);
    t.going = entrants;
    for (const id of entrants) charge(id, "tournament", t.id, t.feePence, t.heldOn, id % 4 !== 0);
  }
}

/** Mark a charge paid (transfer or cash), or take it back. */
export function markPaid(chargeId: number, via: "transfer" | "cash") {
  const c = db.charges.find((x) => x.id === chargeId);
  if (c) Object.assign(c, { paidOn: londonToday(), paidVia: via });
}
export function markUnpaid(chargeId: number) {
  const c = db.charges.find((x) => x.id === chargeId);
  if (c) Object.assign(c, { paidOn: null, paidVia: null });
}
