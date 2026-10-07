// Talking to the team app's Worker (team/app/worker/api.ts). Every change goes to D1 first; then the app's working
// copy (demo/store.svelte.ts) is refreshed from /api/bootstrap, so what you see is what's stored. Screens change
// the copy at once for a quick answer, then the refresh brings back what the server decided (the waitlist, say).
import type { MemberRow, Role } from "../demo/data";
import {
  hydrate,
  MEMBERS,
  ONE_OFFS,
  QUIPS,
  ROLES,
  SERIES,
  SESSIONS,
  TEAMS,
  TOURNAMENTS,
  TOURNAMENT_TYPES,
} from "../demo/data";
import type { Position } from "../demo/data";
import type { Quip, QuipKind } from "../lib/quips";
import type { Team } from "../lib/snake";
import { api, getBootstrap } from "./api";
import type { Tournament, TournamentType, TrainingSeries } from "../demo/model";
import { db } from "../demo/store.svelte";

/** The last save's outcome, shown briefly by the shell. */
export const saving = $state({ busy: 0, message: "", failed: false });

/** Reload the club's data into the app. */
export async function refresh() {
  hydrate(await getBootstrap());
  db.series = structuredClone(SERIES);
  db.sessions = structuredClone(SESSIONS);
  db.tournamentTypes = structuredClone(TOURNAMENT_TYPES);
  db.tournaments = structuredClone(TOURNAMENTS);
  db.oneOffs = structuredClone(ONE_OFFS);
  db.roles = structuredClone(ROLES);
  db.members = structuredClone(MEMBERS);
  db.quips = structuredClone(QUIPS);
  db.teams = structuredClone(TEAMS);
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
/** Publish a session's teams: everyone sees them. */
export const publishTeams = (sessionId: number, teams: Team[]) =>
  save(() => api("POST", `/api/sessions/${sessionId}/teams`, { teams }), "Teams published");
/** Your own phone, position and bio. */
export const saveProfile = (p: { position: Position; phone: string; bio: string }) =>
  save(() => api("PUT", "/api/me", p));
/** The role the app opens as (ADR 0037); null for your full role. */
export const saveEverydayRole = (roleId: number | null) => save(() => api("PUT", "/api/me/everyday-role", { roleId }));
/** Make someone a Quarterly Member from today, or end it (ADR 0034). */
export const setQuarterly = (memberId: number, quarterly: boolean) =>
  save(() => api("POST", `/api/members/${memberId}/quarterly`, { quarterly }));
/** A member's attendance for a year, for an admin: every session held so far, answered or not. */
export interface AttendanceRow {
  sessionId: number;
  heldOn: string;
  series: string;
  signup: "in" | "waitlist" | "out" | null;
  attended: boolean | null;
  walkIn: boolean;
  cancelled: boolean;
}
export const attendanceOf = (memberId: number, year?: string) =>
  api<AttendanceRow[]>("GET", `/api/members/${memberId}/attendance${year ? `?year=${year}` : ""}`);
/** Home's quips. */
export const addQuip = (kind: QuipKind, text: string) =>
  save(() => api<{ id: number }>("POST", "/api/quips", { kind, text }), "Added");
export const saveQuip = (q: Quip) => save(() => api("PUT", `/api/quips/${q.id}`, { text: q.text }));
export const deleteQuip = (id: number) => save(() => api("DELETE", `/api/quips/${id}`), "Removed");

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

/** An admin sets a member's email (what they sign in with) and phone. */
export const saveContact = (memberId: number, email: string, phone: string) =>
  save(() => api("PUT", `/api/members/${memberId}/contact`, { email, phone }));

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
/** The next 12 weeks of a training's sessions, past the last one made. */
export const moreSessions = (seriesId: number) => save(() => api("POST", `/api/series/${seriesId}/more`), "");
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
  dateConfirmed: t.dateConfirmed,
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
