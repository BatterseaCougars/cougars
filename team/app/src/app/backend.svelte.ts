// Talking to the team app's Worker (team/app/worker/api.ts). Every change goes to D1 first; its reply carries the
// parts of the club it touched (`changed`), which replace those parts of the app's working copy
// (demo/store.svelte.ts), so what you see is what's stored. Screens change the copy at once for a quick answer, then
// the reply brings back what the server decided (the waitlist, say). The whole club is read when the app opens, when
// it comes back into view (only if something changed, ADR 0054), and after a failed change.
import type { MemberRow, Role } from "../demo/data";
import {
  applySlices,
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
  VENUES,
} from "../demo/data";
import type { Position, Slices } from "../demo/data";
import type { Quip, QuipKind } from "../lib/quips";
import type { Team } from "../lib/snake";
import { api, bootstrapIfChanged, brake, getBootstrap } from "./api";
import type { Tournament, TournamentType, TrainingSeries, Venue } from "../demo/model";
import { db } from "../demo/store.svelte";

/** The last save's outcome, shown briefly by the shell. */
export const saving = $state({ busy: 0, message: "", failed: false });

// Each slice of the club, copied into the store from demo/data.ts once it's in place there
const COPY: Record<keyof Slices, () => void> = {
  everydayRole: () => {},
  members: () => (db.members = structuredClone(MEMBERS)),
  roles: () => (db.roles = structuredClone(ROLES)),
  venues: () => (db.venues = structuredClone(VENUES)),
  series: () => (db.series = structuredClone(SERIES)),
  sessions: () => {
    db.sessions = structuredClone(SESSIONS);
    db.teams = structuredClone(TEAMS);
  },
  tournamentTypes: () => (db.tournamentTypes = structuredClone(TOURNAMENT_TYPES)),
  tournaments: () => (db.tournaments = structuredClone(TOURNAMENTS)),
  clubEvents: () => (db.oneOffs = structuredClone(ONE_OFFS)),
  quips: () => (db.quips = structuredClone(QUIPS)),
};
const copyAll = () => Object.values(COPY).forEach((copy) => copy());

/** Put what a change sent back in place; nothing else is touched. */
function apply(changed: Slices) {
  applySlices(changed);
  for (const key of Object.keys(changed) as (keyof Slices)[]) COPY[key]?.();
}

/** Reload the whole club into the app. */
export async function refresh() {
  hydrate(await getBootstrap());
  copyAll();
}

/** Anyone else's changes, if there are any: a small check (no club data read) when there aren't (ADR 0054). */
export async function refreshIfChanged() {
  // A background check: skipped while the brake says wait (ADR 0058)
  if (!brake.mayCheck()) return;
  const b = await bootstrapIfChanged();
  if (!b) return;
  hydrate(b);
  copyAll();
}

// Back to the app (another tab, the phone unlocked): what others changed meanwhile. Not in the middle of a save,
// whose own reply is on its way.
if (typeof document !== "undefined")
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !saving.busy) refreshIfChanged().catch(() => {});
  });

let clearing: ReturnType<typeof setTimeout> | undefined;
function say(message: string, failed: boolean) {
  Object.assign(saving, { message, failed });
  clearTimeout(clearing);
  clearing = setTimeout(() => (saving.message = ""), failed ? 6000 : 2200);
}

/**
 * Send a change, then put what it touched in place (the whole club, if the reply doesn't say). Says `done` ("Saved") or what went wrong; an empty `done` stays quiet on success,
 * for taps that show their own result. Returns the server's reply, or null if it failed.
 */
export async function save<T>(change: () => Promise<T>, done = "Saved"): Promise<T | null> {
  saving.busy++;
  try {
    const result = await change();
    const changed = (result as { changed?: Slices } | null)?.changed;
    if (changed) apply(changed);
    else await refresh();
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
export const saveProfile = (p: { position: Position; phone: string; bio: string; webName: string }) =>
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

/** A saved venue (ADR 0051). */
const venueBody = (v: Venue) => ({ name: v.name, address: v.address, mapUrl: v.mapUrl, active: v.active });
export const createVenue = (v: Venue) =>
  save(() => api<{ id: number }>("POST", "/api/venues", venueBody(v)), "Venue saved");
export const updateVenue = (v: Venue) => save(() => api("PUT", `/api/venues/${v.id}`, venueBody(v)));

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
  venueId: s.venueId,
  venue: s.venue,
  mapUrl: s.mapUrl,
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
  kind: t.kind,
  active: t.active,
  defaultFeePence: t.defaultFeePence,
  awards: t.awards,
  venueId: t.venueId,
  location: t.location,
  mapUrl: t.mapUrl,
});
export const createTournamentType = (t: TournamentType) =>
  save(() => api<{ id: number; slug: string }>("POST", "/api/tournament-types", typeBody(t)), "Tournament added");
export const updateTournamentType = (t: TournamentType) =>
  save(() => api("PUT", `/api/tournament-types/${t.id}`, typeBody(t)));

const tournamentBody = (t: Tournament) => ({
  typeId: t.typeId,
  name: t.name,
  venueId: t.venueId,
  location: t.location,
  mapUrl: t.mapUrl,
  heldOn: t.heldOn,
  startTime: t.startTime,
  endTime: t.endTime,
  capacity: t.capacity,
  status: t.status,
  feePence: t.feePence,
  dateConfirmed: t.dateConfirmed,
  season: t.season,
  public: t.public,
  signupClosesOn: t.signupClosesOn,
  draftOn: t.draftOn,
  draftTime: t.draftTime,
  pointsWin: t.pointsWin,
  pointsDraw: t.pointsDraw,
  pointsLoss: t.pointsLoss,
  gameMinutes: t.gameMinutes,
  kind: t.kind,
  awards: t.awards,
  teams: t.teams,
});
/** The captain on the clock (or whoever's running the draft) picks a member. */
export const draftPick = (tournamentId: number, memberId: number) =>
  save(() => api("POST", `/api/tournaments/${tournamentId}/draft/picks`, { memberId }), "Picked");
/** Whoever's running the draft takes back the last pick. */
export const undoDraftPick = (tournamentId: number) =>
  save(() => api("DELETE", `/api/tournaments/${tournamentId}/draft/picks/last`), "Pick undone");
export const createTournament = (t: Tournament) =>
  save(() => api<{ id: number }>("POST", "/api/tournaments", tournamentBody(t)), "Date added");
export const updateTournament = (t: Tournament) =>
  save(() => api("PUT", `/api/tournaments/${t.id}`, tournamentBody(t)));

/** A one-off event as the app sends it. */
export interface ClubEventBody {
  title: string;
  startsAt: string;
  endsAt: string;
  venueId: number | null;
  venue: string;
  mapUrl: string;
  description: string;
  public: boolean;
  signup: boolean;
  capacity: number | null;
}
export const createClubEvent = (e: ClubEventBody) =>
  save(() => api<{ id: number }>("POST", "/api/club-events", e), "Added to the calendar");
export const updateClubEvent = (id: number, e: ClubEventBody) => save(() => api("PUT", `/api/club-events/${id}`, e));
export const setClubEventCancelled = (id: number, cancelled: boolean) =>
  save(() => api("POST", `/api/club-events/${id}/cancelled`, { cancelled }), cancelled ? "Cancelled" : "Back on");
