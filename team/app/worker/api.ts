// The team app's JSON API. Every route declares the action it needs (ADR 0024); a request is refused unless the
// signed-in member's roles grant it (manage:all grants everything). Anything not listed here is a 404.
import { londonToday } from "../src/lib/dates";
import { can, type Action } from "../src/access/actions";
import { all } from "../../../shared/d1";
import { handleAuth, sessionOf, type AuthEnv } from "./auth";
import { answer, listEntries, mark, setPlayer, type EntryKind } from "./entries";
import { closeDraft, openDraft, pick, putOnTeam, resetDraft, takeOffTeam, undoPick } from "./draft";
import { makeFixtures, scoreGame } from "./fixtures";
import { addGoal, clockGame, holdScoresheet, removeGoal, undoGoal } from "./scoring";
import { readUsage } from "./usage";
import { readSettings, saveSettings } from "./settings";
import { setWinners } from "./awards";
import { readAgenda } from "../../../shared/agenda";
import { HttpError, body, json, sameOrigin } from "./http";
import { LIMITS, addressOf, enforce } from "./limits";
import { bootstrapTag, buildOf, bumpDataVersion, dataVersion, notModified, tagged } from "./version";
import {
  actionsOf,
  addMember,
  attendanceOf,
  createRole,
  firstAdmin,
  listMembers,
  listRoles,
  setContact,
  setQuarterly,
  updateMember,
  updateProfile,
  everydayRoleOf,
  setEverydayRole,
  updateRole,
} from "./people";
import { createQuip, deleteQuip, listQuips, updateQuip } from "./quips";
import { listTeams, publishTeams } from "./teams";
import {
  createClubEvent,
  setClubEventCancelled,
  updateClubEvent,
  createSeries,
  createTournament,
  createTournamentType,
  createVenue,
  ensureSessions,
  listClubEvents,
  listSeries,
  listSessions,
  listTournamentTypes,
  listTournaments,
  listVenues,
  moreSessions,
  setSessionCancelled,
  setTeamLook,
  updateSeries,
  updateTournament,
  updateTournamentType,
  updateVenue,
} from "./schedule";

export interface Env extends AuthEnv {
  /** "1", and only with TEAM_ENV "local" (tests, `TEAM_AUTO_ADMIN=1 npm run dev`): no session means the first admin. */
  TEAM_AUTO_ADMIN?: string;
  /** This deploy's version (wrangler.jsonc version_metadata): part of the bootstrap's ETag. */
  CF_VERSION_METADATA?: { id: string };
  /** Read-only (Account Analytics: Read), for the Usage page and the hourly check (ADR 0059). */
  CLOUDFLARE_ANALYTICS_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
}

export interface Ctx {
  env: Env;
  request: Request;
  params: string[];
  memberId: number;
  actions: Set<Action>;
  today: string;
  now: string;
}

interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: RegExp;
  /** The action this route needs; "authenticated" for any signed-in member. */
  action: Action | "authenticated";
  /**
   * A change: the parts of the club it can touch. They come back with the reply, as `changed`, so the app puts them
   * in place without reloading the whole club. Every route that isn't a GET says.
   */
  changes?: readonly Slice[];
  handle: (c: Ctx) => Promise<Response>;
}

// ─── The club, in parts ───
// The bootstrap is all of them; a change's reply is the ones it touched. Each is what this member may see (ADR 0036).

const SLICES = {
  // The role the app opens as, when it isn't your full one (ADR 0037)
  everydayRole: (c: Ctx) => everydayRoleOf(c.env.DB, c.memberId),
  members: (c: Ctx) => {
    const can = (a: Action) => c.actions.has("manage:all") || c.actions.has(a);
    return listMembers(c.env.DB, {
      ratings: can("read:Rating"),
      privateFor: can("manage:Member") ? "all" : c.memberId,
      today: c.today,
    });
  },
  roles: (c: Ctx) => listRoles(c.env.DB),
  venues: (c: Ctx) => listVenues(c.env.DB),
  series: (c: Ctx) => listSeries(c.env.DB),
  // A few weeks back, for what's just been held
  sessions: async (c: Ctx) =>
    withTeams(
      c.env.DB,
      await withEntries(
        c.env.DB,
        "session",
        await listSessions(c.env.DB, new Date(Date.parse(c.today) - 28 * 86_400_000).toISOString().slice(0, 10)),
      ),
    ),
  tournamentTypes: (c: Ctx) => listTournamentTypes(c.env.DB),
  tournaments: async (c: Ctx) =>
    draftSeenBy(c, await withEntries(c.env.DB, "tournament", await listTournaments(c.env.DB))),
  clubEvents: async (c: Ctx) => withEntries(c.env.DB, "event", await listClubEvents(c.env.DB, c.now)),
  quips: (c: Ctx) => listQuips(c.env.DB),
  // How often live pages check for updates (ADR 0072)
  settings: (c: Ctx) => readSettings(c.env.DB),
  // What's on from today (ADR 0062). A tournament's draft night is for its captains and whoever runs the draft.
  agenda: async (c: Ctx) => {
    const rows = await readAgenda(c.env.DB, c.today);
    if (!rows.some((r) => r.audience === "captains")) return rows;
    if (can(c.actions, "run:Draft")) return rows;
    const mine = new Set(
      (
        await all<{ id: number }>(
          c.env.DB,
          "SELECT DISTINCT tournament_id id FROM tournament_teams WHERE captain_member_id = ?",
          [c.memberId],
        )
      ).map((t) => t.id),
    );
    return rows.filter((r) => r.audience !== "captains" || (r.source === "tournament" && mine.has(r.sourceId)));
  },
};
export type Slice = keyof typeof SLICES;

/**
 * A draft is for its captains and whoever runs it (ADR 0070): who went when is nobody else's business. Anyone else
 * sees the captains and no players while it's on; once it's closed, the teams, with no pick numbers and in an order
 * that says nothing about them (a hash of the team and player, so it's the same every time they look).
 */
function draftSeenBy<T extends Awaited<ReturnType<typeof listTournaments>>[number]>(c: Ctx, tournaments: T[]): T[] {
  // Whoever runs the draft, and admins who edit the teams, see it all
  if (can(c.actions, "run:Draft") || can(c.actions, "manage:Tournament")) return tournaments;
  const jumble = (teamId: number, memberId: number | null, name: string) =>
    Math.imul(teamId * 31 + (memberId ?? name.length), 2654435761) >>> 0;
  return tournaments.map((t) => {
    if (t.kind !== "draft" || t.teams.some((team) => team.captainMemberId === c.memberId)) return t;
    const closed = t.draftState === "closed";
    return {
      ...t,
      teams: t.teams.map((team) => ({
        ...team,
        players: closed
          ? team.players
              .map((p) => ({ ...p, pick: null }))
              .sort((a, b) => jumble(team.id, a.memberId, a.name) - jumble(team.id, b.memberId, b.name))
          : [],
      })),
    };
  });
}

/** Anything on the calendar changed: the agenda comes back with it (ADR 0062). */
const SCHEDULE: readonly Slice[] = ["series", "sessions", "venues", "tournamentTypes", "tournaments", "clubEvents"];

/** The named parts of the club, read one after another. */
async function slices(c: Ctx, names: readonly Slice[]): Promise<Partial<Record<Slice, unknown>>> {
  const out: Partial<Record<Slice, unknown>> = {};
  for (const name of names) out[name] = await SLICES[name](c);
  return out;
}

// Who can see what depends on roles: after a change to members or roles, read the parts with the actions as they are now
const ACCESS: readonly Slice[] = ["members", "roles", "everydayRole"];

const id = (c: Ctx) => Number(c.params[0]);
const ok = () => json({ ok: true });

// Sign-ups: the same three routes for each kind of event
const KINDS: [string, EntryKind, Slice][] = [
  ["sessions", "session", "sessions"],
  ["tournaments", "tournament", "tournaments"],
  ["club-events", "event", "clubEvents"],
];
async function memberIdIn(c: Ctx) {
  const b = await body(c.request);
  const memberId = Number(b.memberId);
  if (!Number.isInteger(memberId) || memberId <= 0) throw new HttpError(400, "Which member?");
  return { b, memberId };
}
const ENTRY_ROUTES: Route[] = KINDS.flatMap(([path, kind, slice]): Route[] => [
  {
    method: "POST",
    path: new RegExp(`^/api/${path}/(\\d+)/answer$`),
    action: "signup:Event",
    changes: [slice],
    // You, in or out
    handle: async (c) => {
      const b = await body(c.request);
      if (b.answer !== "in" && b.answer !== "out") throw new HttpError(400, "In or out?");
      await answer(c.env.DB, kind, id(c), c.memberId, b.answer, c.now);
      return ok();
    },
  },
  {
    method: "POST",
    path: new RegExp(`^/api/${path}/(\\d+)/players$`),
    action: "update:Event",
    // A past session's line-up is what a player's "played" counts
    changes: slice === "sessions" ? ["sessions", "members"] : [slice],
    // An admin puts someone in, or takes them off
    handle: async (c) => {
      const { b, memberId } = await memberIdIn(c);
      if (typeof b.in !== "boolean") throw new HttpError(400, "in should be true or false.");
      await setPlayer(c.env.DB, kind, id(c), memberId, b.in, c.now);
      return ok();
    },
  },
]);

export const ROUTES: Route[] = [
  {
    method: "GET",
    path: /^\/api\/bootstrap$/,
    action: "authenticated",
    // Everything the app shows, in one go: it's a small club. Or a 304 when nothing's changed (ADR 0054).
    handle: async (c) => {
      const db = c.env.DB;
      const tag = bootstrapTag(buildOf(c.env), await dataVersion(db), c.memberId, c.today);
      if (c.request.headers.get("if-none-match") === tag) return notModified(tag);
      await ensureSessions(db, c.today);
      const reply = json({
        me: c.memberId,
        actions: [...c.actions],
        ...(await slices(c, Object.keys(SLICES) as Slice[])),
      });
      return tagged(reply, tag);
    },
  },
  {
    method: "PUT",
    path: /^\/api\/me$/,
    action: "authenticated",
    changes: ["members"],
    // Your own phone, position and bio
    handle: async (c) => (await updateProfile(c.env.DB, c.memberId, await body(c.request)), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/me\/everyday-role$/,
    action: "authenticated",
    changes: ["everydayRole"],
    // { roleId: number | null }: the role the app opens as (ADR 0037)
    handle: async (c) => (await setEverydayRole(c.env.DB, c.memberId, await body(c.request), c.actions), ok()),
  },
  {
    method: "GET",
    path: /^\/api\/members\/(\d+)\/attendance$/,
    action: "manage:Member",
    // ?year=2026; this year by default
    handle: async (c) => {
      const year = new URL(c.request.url).searchParams.get("year") ?? c.today.slice(0, 4);
      if (!/^\d{4}$/.test(year)) throw new HttpError(400, "year should be like 2026.");
      return json(await attendanceOf(c.env.DB, id(c), year, c.today));
    },
  },
  {
    method: "POST",
    path: /^\/api\/members\/(\d+)\/quarterly$/,
    action: "manage:Member",
    changes: ["members"],
    handle: async (c) => {
      const b = await body(c.request);
      if (typeof b.quarterly !== "boolean") throw new HttpError(400, "quarterly should be true or false.");
      await setQuarterly(c.env.DB, id(c), b.quarterly, c.today, c.now);
      return ok();
    },
  },
  {
    method: "PUT",
    path: /^\/api\/members\/(\d+)\/contact$/,
    action: "manage:Member",
    changes: ["members"],
    handle: async (c) => (await setContact(c.env.DB, id(c), await body(c.request), c.actions), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/members$/,
    action: "manage:Member",
    changes: ["members"],
    // { name, email, position }: in the club now, and emailed a link to the app (ADR 0069)
    handle: async (c) =>
      json(await addMember(c.env, await body(c.request), new URL(c.request.url).origin, new Date(c.now)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/members\/(\d+)$/,
    action: "manage:Member",
    changes: ["members"],
    handle: async (c) => (await updateMember(c.env.DB, id(c), await body(c.request), c.actions), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/roles$/,
    action: "manage:Role",
    changes: ["roles"],
    handle: async (c) => json({ id: await createRole(c.env.DB, await body(c.request), c.actions) }, 201),
  },
  {
    method: "PUT",
    path: /^\/api\/roles\/(\d+)$/,
    action: "manage:Role",
    changes: ["roles", "members"],
    handle: async (c) => (await updateRole(c.env.DB, id(c), await body(c.request), c.actions), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/venues$/,
    action: "manage:Venue",
    changes: ["venues"],
    handle: async (c) => json(await createVenue(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/venues\/(\d+)$/,
    action: "manage:Venue",
    changes: ["venues"],
    handle: async (c) => (await updateVenue(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/series$/,
    action: "manage:Training",
    changes: ["series", "sessions"],
    handle: async (c) => json(await createSeries(c.env.DB, await body(c.request), c.today), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/series\/(\d+)$/,
    action: "manage:Training",
    changes: ["series", "sessions"],
    handle: async (c) => (await updateSeries(c.env.DB, id(c), await body(c.request), c.today), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/series\/(\d+)\/more$/,
    action: "manage:Training",
    changes: ["sessions"],
    handle: async (c) => (await moreSessions(c.env.DB, id(c), c.today), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/sessions\/(\d+)\/cancelled$/,
    action: "manage:Training",
    changes: ["sessions", "members"],
    handle: async (c) => {
      const b = await body(c.request);
      if (typeof b.cancelled !== "boolean") throw new HttpError(400, "cancelled should be true or false.");
      await setSessionCancelled(c.env.DB, id(c), b.cancelled, c.now);
      return ok();
    },
  },
  {
    method: "POST",
    path: /^\/api\/tournament-types$/,
    action: "manage:Tournament",
    changes: ["tournamentTypes"],
    handle: async (c) => json(await createTournamentType(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/tournament-types\/(\d+)$/,
    action: "manage:Tournament",
    changes: ["tournamentTypes"],
    handle: async (c) => (await updateTournamentType(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments$/,
    action: "manage:Tournament",
    changes: ["tournaments"],
    handle: async (c) => json(await createTournament(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)$/,
    action: "manage:Tournament",
    changes: ["tournaments"],
    handle: async (c) => (await updateTournament(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "GET",
    path: /^\/api\/usage$/,
    action: "read:Usage",
    // Today's use of the club's free Cloudflare allowance (ADR 0059)
    handle: async (c) => json(await readUsage(c.env, new Date(c.now))),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)\/winners$/,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // { winners: [{ award, teamId | memberId }] }: who won the tournament's awards (ADR 0073)
    handle: async (c) => (await setWinners(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/settings$/,
    action: "manage:Settings",
    changes: ["settings"],
    // { liveRefreshSeconds }: how often live pages check for updates (ADR 0072)
    handle: async (c) => (await saveSettings(c.env.DB, await body(c.request)), ok()),
  },
  ...ENTRY_ROUTES,
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/draft\/picks$/,
    // The captain on the clock, or whoever's running the draft: draft.ts decides
    action: "authenticated",
    changes: ["tournaments"],
    handle: async (c) => {
      const { memberId } = await memberIdIn(c);
      await pick(c.env.DB, id(c), memberId, c);
      return ok();
    },
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)\/draft\/picks\/last$/,
    action: "run:Draft",
    changes: ["tournaments"],
    handle: async (c) => (await undoPick(c.env.DB, id(c)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/fixtures$/,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // The round robin and its playoffs, once the teams are set (ADR 0061)
    handle: async (c) => (await makeFixtures(c.env.DB, id(c)), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)$/,
    action: "score:Match",
    changes: ["tournaments"],
    // A game's final score; the last group result fills the playoffs
    handle: async (c) => (await scoreGame(c.env.DB, id(c), Number(c.params[1]), await body(c.request)), ok()),
  },
  // Scoring a game as it's played (ADR 0071): whoever holds the scoresheet
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/scorer$/,
    action: "authenticated",
    changes: ["tournaments"],
    // { action: "claim" | "release" }: Start scoring, or let it go
    handle: async (c) => (await holdScoresheet(c.env.DB, id(c), Number(c.params[1]), await body(c.request), c), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/clock$/,
    action: "authenticated",
    changes: ["tournaments"],
    // { action: "start" | "pause" | "end" }
    handle: async (c) => (
      await clockGame(c.env.DB, id(c), Number(c.params[1]), await body(c.request), c, new Date(c.now)),
      ok()
    ),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/goals$/,
    action: "authenticated",
    changes: ["tournaments"],
    // { teamId, scorerId?, assistId? }
    handle: async (c) => (
      await addGoal(c.env.DB, id(c), Number(c.params[1]), await body(c.request), c, new Date(c.now)),
      ok()
    ),
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/goals\/last$/,
    action: "authenticated",
    changes: ["tournaments"],
    handle: async (c) => (await undoGoal(c.env.DB, id(c), Number(c.params[1]), c), ok()),
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/goals\/(\d+)$/,
    action: "authenticated",
    changes: ["tournaments"],
    // An admin takes any goal off a finished game (scoring.ts decides who)
    handle: async (c) => (await removeGoal(c.env.DB, id(c), Number(c.params[1]), Number(c.params[2]), c), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/draft\/open$/,
    action: "run:Draft",
    changes: ["tournaments"],
    // The night of the draft: the captains can pick (ADR 0060)
    handle: async (c) => (await openDraft(c.env.DB, id(c)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/draft\/close$/,
    action: "run:Draft",
    changes: ["tournaments"],
    // Everyone's picked (or the rest are left out on purpose): the teams are locked
    handle: async (c) => (await closeDraft(c.env.DB, id(c), (await body(c.request)).leaveOut === true), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)\/teams\/(\d+)\/look$/,
    // Its captain or an admin: setTeamLook decides
    action: "authenticated",
    changes: ["tournaments"],
    handle: async (c) => {
      const admin = can(c.actions, "manage:Tournament");
      await setTeamLook(c.env.DB, id(c), Number(c.params[1]), { memberId: c.memberId, admin }, await body(c.request));
      return ok();
    },
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/teams\/(\d+)\/players$/,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // A replacement, outside the draft: onto this team (from another, or from outside the tournament)
    handle: async (c) => {
      const { memberId } = await memberIdIn(c);
      await putOnTeam(c.env.DB, id(c), Number(c.params[1]), memberId, c.now);
      return ok();
    },
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)\/teams\/(\d+)\/players\/(\d+)$/,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // Off the team, still signed up
    handle: async (c) => (await takeOffTeam(c.env.DB, id(c), Number(c.params[1]), Number(c.params[2])), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/draft\/reset$/,
    action: "run:Draft",
    changes: ["tournaments"],
    // Start again: the picks (and any fixtures) go, the sign-ups and captains stay
    handle: async (c) => (await resetDraft(c.env.DB, id(c)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/sessions\/(\d+)\/teams$/,
    action: "publish:Teams",
    changes: ["sessions"],
    handle: async (c) => (await publishTeams(c.env.DB, id(c), await body(c.request), c.memberId, c.now), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/quips$/,
    action: "manage:Quip",
    changes: ["quips"],
    handle: async (c) => json(await createQuip(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/quips\/(\d+)$/,
    action: "manage:Quip",
    changes: ["quips"],
    handle: async (c) => (await updateQuip(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "DELETE",
    path: /^\/api\/quips\/(\d+)$/,
    action: "manage:Quip",
    changes: ["quips"],
    handle: async (c) => (await deleteQuip(c.env.DB, id(c)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/sessions\/(\d+)\/register$/,
    action: "record:Attendance",
    changes: ["sessions", "members"],
    // The register on the night: here or not
    handle: async (c) => {
      const { b, memberId } = await memberIdIn(c);
      if (typeof b.here !== "boolean") throw new HttpError(400, "here should be true or false.");
      await mark(c.env.DB, id(c), memberId, b.here, c.memberId, c.now);
      return ok();
    },
  },
  {
    method: "POST",
    path: /^\/api\/club-events$/,
    action: "create:Event",
    changes: ["clubEvents"],
    handle: async (c) => json(await createClubEvent(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/club-events\/(\d+)$/,
    action: "update:Event",
    changes: ["clubEvents"],
    handle: async (c) => (await updateClubEvent(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/club-events\/(\d+)\/cancelled$/,
    action: "update:Event",
    changes: ["clubEvents"],
    handle: async (c) => {
      const b = await body(c.request);
      if (typeof b.cancelled !== "boolean") throw new HttpError(400, "cancelled should be true or false.");
      await setClubEventCancelled(c.env.DB, id(c), b.cancelled, c.now);
      return ok();
    },
  },
];

/** Each event with everyone's answers on it. */
async function withEntries<T extends { id: number }>(db: D1Database, kind: EntryKind, rows: T[]) {
  const entries = await listEntries(
    db,
    kind,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ ...r, ...entries.get(r.id)! }));
}

/** Each session with its published teams. */
async function withTeams<T extends { id: number }>(db: D1Database, rows: T[]) {
  const teams = await listTeams(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ ...r, teams: teams.get(r.id) ?? [] }));
}

/** Who's asking: their session, or (on your own machine, when asked for) the first admin. */
async function whoIs(request: Request, env: Env, now: Date): Promise<{ memberId: number; setCookie?: string } | null> {
  const session = await sessionOf(request, env, now);
  if (session) return session;
  if (env.TEAM_ENV === "local" && env.TEAM_AUTO_ADMIN === "1") {
    const memberId = await firstAdmin(env.DB);
    return memberId == null ? null : { memberId };
  }
  return null;
}

export async function handleApi(
  request: Request,
  env: Env,
  now = new Date(),
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/health") return json({ ok: true });
  if (!sameOrigin(request)) return json({ error: "That came from somewhere else." }, 403);
  try {
    // A generous limit per address (ADR 0056); sign-in and changes have tighter ones of their own
    await enforce("api", addressOf(request), LIMITS.perAddress, "Too many requests from here. Wait a minute.");
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    throw e;
  }
  if (url.pathname.startsWith("/api/auth/")) {
    try {
      return (await handleAuth(request, env, now, waitUntil)) ?? json({ error: "Not found." }, 404);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "Something went wrong." }, 500);
    }
  }
  const match = ROUTES.map((r) => ({ r, m: url.pathname.match(r.path) })).filter((x) => x.m);
  const hit = match.find((x) => x.r.method === request.method);
  if (!hit) return json({ error: match.length ? "Method not allowed." : "Not found." }, match.length ? 405 : 404);
  try {
    const who = await whoIs(request, env, now);
    if (!who) return json({ error: "Sign in first." }, 401);
    const { memberId } = who;
    const writes = request.method !== "GET";
    if (writes)
      await enforce(
        "writes",
        String(memberId),
        LIMITS.writesPerMember,
        "That's a lot of changes at once. Wait a minute.",
      );
    const actions = await actionsOf(env.DB, memberId);
    const { action } = hit.r;
    if (action !== "authenticated" && !actions.has("manage:all") && !actions.has(action))
      return json({ error: "Your role can't do that." }, 403);
    const ctx: Ctx = {
      env,
      request,
      params: hit.m!.slice(1),
      memberId,
      actions,
      today: londonToday(now),
      now: now.toISOString(),
    };
    const res = await hit.r.handle(ctx);
    if (writes && res.ok) {
      // A change: every member's bootstrap is out of date (ADR 0054)
      await bumpDataVersion(env.DB);
      // ...and this member gets the parts it touched back, to put in place
      const declared = hit.r.changes ?? [];
      const changes = declared.some((d) => SCHEDULE.includes(d)) ? [...declared, "agenda" as const] : declared;
      if (changes.length) {
        const now = changes.some((s) => ACCESS.includes(s))
          ? { ...ctx, actions: await actionsOf(env.DB, memberId) }
          : ctx;
        const reply = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const out = json({ ...reply, changed: await slices(now, changes) }, res.status);
        if (who.setCookie) out.headers.append("set-cookie", who.setCookie);
        return out;
      }
    }
    // A session in use is renewed now and then
    if (who.setCookie) res.headers.append("set-cookie", who.setCookie);
    return res;
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Something went wrong." }, 500);
  }
}
