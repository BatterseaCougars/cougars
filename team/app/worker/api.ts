// The team app's JSON API. Every route declares the action it needs (ADR 0024); a request is refused unless the
// signed-in member's roles grant it (manage:all grants everything). Anything not listed here is a 404.
import { londonToday } from "../src/lib/dates";
import type { Action } from "../src/access/actions";
import { HttpError, body, json } from "./http";
import { actionsOf, createRole, firstAdmin, listMembers, listRoles, updateMember, updateRole } from "./people";
import {
  createClubEvent,
  createSeries,
  createTournament,
  createTournamentType,
  ensureSessions,
  listClubEvents,
  listSeries,
  listSessions,
  listTournamentTypes,
  listTournaments,
  setSessionCancelled,
  updateSeries,
  updateTournament,
  updateTournamentType,
} from "./schedule";

export interface Env {
  DB: D1Database;
  /** "local" only under `vite` on your machine: then you're the first admin. Everywhere else, sign-in decides. */
  TEAM_ENV?: string;
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
  method: "GET" | "POST" | "PUT";
  path: RegExp;
  /** The action this route needs; "authenticated" for any signed-in member. */
  action: Action | "authenticated";
  handle: (c: Ctx) => Promise<Response>;
}

const id = (c: Ctx) => Number(c.params[0]);
const ok = () => json({ ok: true });

export const ROUTES: Route[] = [
  {
    method: "GET",
    path: /^\/api\/bootstrap$/,
    action: "authenticated",
    // Everything the app shows, in one go: it's a small club.
    handle: async (c) => {
      const db = c.env.DB;
      await ensureSessions(db, c.today);
      const can = (a: Action) => c.actions.has("manage:all") || c.actions.has(a);
      return json({
        me: c.memberId,
        actions: [...c.actions],
        members: await listMembers(db, { ratings: can("read:Rating") }),
        roles: await listRoles(db),
        series: await listSeries(db),
        // A few weeks back, for what's just been held
        sessions: await listSessions(db, new Date(Date.parse(c.today) - 28 * 86_400_000).toISOString().slice(0, 10)),
        tournamentTypes: await listTournamentTypes(db),
        tournaments: await listTournaments(db),
        clubEvents: await listClubEvents(db, c.now),
      });
    },
  },
  {
    method: "PUT",
    path: /^\/api\/members\/(\d+)$/,
    action: "manage:Member",
    handle: async (c) => (await updateMember(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/roles$/,
    action: "manage:Role",
    handle: async (c) => json({ id: await createRole(c.env.DB, await body(c.request)) }, 201),
  },
  {
    method: "PUT",
    path: /^\/api\/roles\/(\d+)$/,
    action: "manage:Role",
    handle: async (c) => (await updateRole(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/series$/,
    action: "manage:Training",
    handle: async (c) => json(await createSeries(c.env.DB, await body(c.request), c.today), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/series\/(\d+)$/,
    action: "manage:Training",
    handle: async (c) => (await updateSeries(c.env.DB, id(c), await body(c.request), c.today), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/sessions\/(\d+)\/cancelled$/,
    action: "manage:Training",
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
    handle: async (c) => json(await createTournamentType(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/tournament-types\/(\d+)$/,
    action: "manage:Tournament",
    handle: async (c) => (await updateTournamentType(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments$/,
    action: "manage:Tournament",
    handle: async (c) => json(await createTournament(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)$/,
    action: "manage:Tournament",
    handle: async (c) => (await updateTournament(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/club-events$/,
    action: "create:Event",
    handle: async (c) => json(await createClubEvent(c.env.DB, await body(c.request)), 201),
  },
];

/** Who's asking. Until sign-in (T1), only a local dev server has an answer: the first admin. */
async function whoIs(env: Env): Promise<number | null> {
  if (env.TEAM_ENV === "local") return firstAdmin(env.DB);
  return null;
}

export async function handleApi(request: Request, env: Env, now = new Date()): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/health") return json({ ok: true });
  const match = ROUTES.map((r) => ({ r, m: url.pathname.match(r.path) })).filter((x) => x.m);
  const hit = match.find((x) => x.r.method === request.method);
  if (!hit) return json({ error: match.length ? "Method not allowed." : "Not found." }, match.length ? 405 : 404);
  try {
    const memberId = await whoIs(env);
    if (memberId == null) return json({ error: "Sign in first." }, 401);
    const actions = await actionsOf(env.DB, memberId);
    const { action } = hit.r;
    if (action !== "authenticated" && !actions.has("manage:all") && !actions.has(action))
      return json({ error: "Your role can't do that." }, 403);
    return await hit.r.handle({
      env,
      request,
      params: hit.m!.slice(1),
      memberId,
      actions,
      today: londonToday(now),
      now: now.toISOString(),
    });
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Something went wrong." }, 500);
  }
}
