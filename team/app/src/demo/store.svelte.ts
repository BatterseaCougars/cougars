// The demo's in-memory "database": changes last until reload. D1 replaces it from T1.
import { londonToday } from "../lib/dates";
import { datesToMake } from "../lib/recurrence";
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
  /** Published teams, by session id. */
  teams: {} as Record<number, Team[]>,
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
