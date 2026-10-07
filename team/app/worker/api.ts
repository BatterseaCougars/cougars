// The team app's JSON API. Every route declares the action it needs (ADR 0024); a request is refused unless the
// signed-in member's roles grant it (manage:all grants everything). Anything not listed here is a 404.
import { londonToday } from "../src/lib/dates";
import type { Action } from "../src/access/actions";
import { handleAuth, sessionOf, type AuthEnv } from "./auth";
import { answer, listEntries, mark, setPlayer, type EntryKind } from "./entries";
import { pick, undoPick } from "./draft";
import { HttpError, body, json, sameOrigin } from "./http";
import { LIMITS, addressOf, enforce } from "./limits";
import { bootstrapTag, buildOf, bumpDataVersion, dataVersion, notModified, tagged } from "./version";
import {
  actionsOf,
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
  tournaments: async (c: Ctx) => withEntries(c.env.DB, "tournament", await listTournaments(c.env.DB)),
  clubEvents: async (c: Ctx) => withEntries(c.env.DB, "event", await listClubEvents(c.env.DB, c.now)),
  quips: (c: Ctx) => listQuips(c.env.DB),
};
export type Slice = keyof typeof SLICES;

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
  ...ENTRY_ROUTES,
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/draft\/picks$/,
    // The captain on the clock, or whoever's running the draft: draft.ts decides
    action: "authenticated",
    changes: ["tournaments"],
    handle: async (c) => {
      const { memberId } = await memberIdIn(c);
      await pick(c.env.DB, id(c), memberId, c, c.now);
      return ok();
    },
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)\/draft\/picks\/last$/,
    action: "run:Draft",
    changes: ["tournaments"],
    handle: async (c) => (await undoPick(c.env.DB, id(c), c.now), ok()),
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
      const changes = hit.r.changes ?? [];
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
