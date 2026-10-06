// Talking to the team app's Worker (team/app/worker/api.ts). Every change goes to D1 first; then the app's working
// copy (demo/store.svelte.ts) is refreshed from /api/bootstrap, so what you see is what's stored. Screens change
// the copy at once for a quick answer, then the refresh brings back what the server decided (the waitlist, say).
import type { MemberRow, Role } from "../demo/data";
import { hydrate, MEMBERS, ONE_OFFS, ROLES, SERIES, SESSIONS, TOURNAMENTS, TOURNAMENT_TYPES } from "../demo/data";
import { api, getBootstrap } from "./api";
import type { Tournament, TournamentType, TrainingSeries } from "../demo/model";
import { db } from "../demo/store.svelte";

/** The last save's outcome, shown briefly by the shell. */
export const saving = $state({ busy: 0, message: "", failed: false });

/** Reload the club's data into the app, keeping what still lives only in the browser (plans). */
export async function refresh() {
  // Lookups built and read here, never kept: plain Maps are right.
  /* eslint-disable svelte/prefer-svelte-reactivity */
  hydrate(await getBootstrap());
  db.series = structuredClone(SERIES);
  db.sessions = structuredClone(SESSIONS);
  db.tournamentTypes = structuredClone(TOURNAMENT_TYPES);
  db.tournaments = structuredClone(TOURNAMENTS);
  db.oneOffs = structuredClone(ONE_OFFS);
  db.roles = structuredClone(ROLES);
  const plans = new Map(db.members.map((m) => [m.player.id, m.plan]));
  db.members = structuredClone(MEMBERS).map((m) => ({ ...m, plan: plans.get(m.player.id) ?? m.plan }));
  /* eslint-enable svelte/prefer-svelte-reactivity */
}

let clearing: ReturnType<typeof setTimeout> | undefined;
function say(message: string, failed: boolean) {
  Object.assign(saving, { message, failed });
  clearTimeout(clearing);
  clearing = setTimeout(() => (saving.message = ""), failed ? 6000 : 2200);
}

/**
 * Send a change, then refresh. Says `done` ("Saved") or what went wrong; an empty `done` stays quiet on success,
 * for taps that show their own result. Returns the server's reply, or null if it failed.
 */
export async function save<T>(change: () => Promise<T>, done = "Saved"): Promise<T | null> {
  saving.busy++;
  try {
    const result = await change();
    await refresh();
    if (done) say(done, false);
    return result;
  } catch (e) {
    say(e instanceof Error ? e.message : "Couldn't save.", true);
    await refresh().catch(() => {});
    return null;
  } finally {
    saving.busy--;
  }
}

// ─── The changes the screens make ───

// Sign-ups. A Bookable's key says which kind of event it is (demo/schedule.svelte.ts).
const ENTRY_PATHS: Record<string, string> = { session: "sessions", tournament: "tournaments", oneoff: "club-events" };
function entryPath(key: string) {
  const [kind, id] = key.split(":");
  return `/api/${ENTRY_PATHS[kind]}/${id}`;
}
/** You say in or out. */
export const answerFor = (key: string, answer: "in" | "out") =>
  save(() => api("POST", `${entryPath(key)}/answer`, { answer }), "");
/** An admin puts someone in a session, or takes them off. */
export const setPlayer = (sessionId: number, memberId: number, inIt: boolean) =>
  save(() => api("POST", `/api/sessions/${sessionId}/players`, { memberId, in: inIt }), inIt ? "Added" : "Taken off");
/** The register: here or not. */
export const markHere = (sessionId: number, memberId: number, here: boolean) =>
  save(() => api("POST", `/api/sessions/${sessionId}/register`, { memberId, here }), "");

export const saveMember = (m: MemberRow) =>
  save(() =>
    api("PUT", `/api/members/${m.player.id}`, {
      name: m.player.name,
      position: m.player.position,
      rating: m.player.rating,
      cougar: m.player.cougar,
      status: m.status,
      roles: m.roles,
    }),
  );

export const saveRole = (r: Role) =>
  save(() => api("PUT", `/api/roles/${r.id}`, { name: r.name, description: r.description, actions: r.actions }));
export const addRole = (name: string) =>
  save(
    () => api<{ id: number }>("POST", "/api/roles", { name, description: "", actions: ["read:Event"] }),
    "Role added",
  );

const seriesBody = (s: TrainingSeries) => ({
  name: s.name,
  shortName: s.shortName,
  icon: s.icon,
  tone: s.tone,
  repeatEvery: s.repeatEvery,
  weekdays: s.weekdays,
  startsOn: s.startsOn,
  endsOn: s.endsOn,
  startTime: s.startTime,
  endTime: s.endTime,
  venue: s.venue,
  capacity: s.capacity,
  goalieCapacity: s.goalieCapacity ?? null,
  public: s.public,
  active: s.active,
});
export const createSeries = (s: TrainingSeries) =>
  save(() => api<{ id: number; slug: string }>("POST", "/api/series", seriesBody(s)), "Training added");
export const updateSeries = (s: TrainingSeries) => save(() => api("PUT", `/api/series/${s.id}`, seriesBody(s)));
export const setCancelled = (sessionId: number, cancelled: boolean) =>
  save(
    () => api("POST", `/api/sessions/${sessionId}/cancelled`, { cancelled }),
    cancelled ? "Session cancelled" : "Session restored",
  );

const typeBody = (t: TournamentType) => ({
  name: t.name,
  shortName: t.shortName,
  icon: t.icon,
  tone: t.tone,
  pointsWin: t.pointsWin,
  pointsDraw: t.pointsDraw,
  pointsLoss: t.pointsLoss,
  gameMinutes: t.gameMinutes,
  draft: t.draft,
  active: t.active,
  defaultFeePence: t.defaultFeePence,
});
export const createTournamentType = (t: TournamentType) =>
  save(() => api<{ id: number; slug: string }>("POST", "/api/tournament-types", typeBody(t)), "Tournament added");
export const updateTournamentType = (t: TournamentType) =>
  save(() => api("PUT", `/api/tournament-types/${t.id}`, typeBody(t)));

const tournamentBody = (t: Tournament) => ({
  typeId: t.typeId,
  name: t.name,
  location: t.location,
  heldOn: t.heldOn,
  startTime: t.startTime,
  endTime: t.endTime,
  capacity: t.capacity,
  status: t.status,
  feePence: t.feePence,
});
export const createTournament = (t: Tournament) =>
  save(() => api<{ id: number }>("POST", "/api/tournaments", tournamentBody(t)), "Date added");
export const updateTournament = (t: Tournament) =>
  save(() => api("PUT", `/api/tournaments/${t.id}`, tournamentBody(t)));

export const createClubEvent = (e: {
  title: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  signup: boolean;
  capacity: number | null;
}) => save(() => api<{ id: number }>("POST", "/api/club-events", e), "Added to the calendar");
