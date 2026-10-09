// The team app's JSON API. Every route declares the action it needs (ADR 0024); a request is refused unless the
// signed-in member's roles grant it (manage:all grants everything). Anything not listed here is a 404.
import { londonToday } from "../src/lib/dates";
import { can, type Action } from "../src/access/actions";
import { handleAuth, localHere, sessionOf, type AuthEnv } from "./auth";
import { AUDIT_PAGE, audit, readAudit } from "./audit";
import { answer, entriesFrom, mark, setPlayer, type EntryKind } from "./entries";
import { closeDraft, draftProgress, openDraft, pick, putOnTeam, resetDraft, takeOffTeam, undoPick } from "./draft";
import { gamesFrom, makeFixtures, scoreGame } from "./fixtures";
import { addGoal, clockGame, holdScoresheet, removeGoal, undoGoal } from "./scoring";
import { readUsage } from "./usage";
import { liveStream, notifyLive } from "./live";
import { saveSettings, settingsFrom } from "./settings";
import { addDevMail, devMailList, devToolsHere, removeDevMail } from "./devtools";
import { setWinners } from "./awards";
import {
  addQuarterCharge,
  chargeAttendance,
  chargeDue,
  chargeQuarters,
  chargeState,
  chargesFrom,
  memberExists,
  payAll,
  payCharge,
  removeCharge,
  setSeriesFees,
  setSubscriptionFee,
  subscriptionFees,
  unpaidOf,
  unpayCharge,
} from "./dues";
import { ensureAgenda, fromRow as agendaItem, type AgendaRow } from "@cougars/shared/agenda";
import { readClub, type Part, type Parts, type Viewer } from "./club";
import { HttpError, body, json, sameOrigin } from "./http";
import { LIMITS, addressOf, enforce } from "./limits";
import { bootstrapTag, buildOf, bumpDataVersion, dataVersion, notModified, sessionsMade, tagged } from "./version";
import {
  actionsOf,
  addMember,
  attendanceOf,
  createRole,
  firstAdmin,
  membersFrom,
  rolesFrom,
  setContact,
  setQuarterly,
  updateMember,
  updateProfile,
  setEverydayRole,
  updateRole,
  canGrant,
  memberEmail,
  memberJoined,
  memberStanding,
  quarterlyToday,
  roleSummary,
} from "./people";
import { createQuip, deleteQuip, updateQuip } from "./quips";
import { teamsFrom, publishTeams, removeTeams, resetSession, sessionSignups } from "./teams";
import { onTheWebsite, tournamentOfPath, wantRebuild, type WebsiteEnv } from "./website";
import {
  createClubEvent,
  setClubEventCancelled,
  updateClubEvent,
  createSeries,
  createTournament,
  createTournamentType,
  createVenue,
  ensureSessions,
  clubEventsFrom,
  seriesFrom,
  tournamentTypesFrom,
  tournamentsFrom,
  venuesFrom,
  type SessionRow,
  moreSessions,
  setSessionCancelled,
  setTeamLook,
  updateSeries,
  updateTournament,
  deleteTournament,
  tournamentSummary,
  updateTournamentType,
  updateVenue,
} from "./schedule";

export interface Env extends AuthEnv, Omit<WebsiteEnv, "DB" | "TEAM_ENV"> {
  /** "1", and only with TEAM_ENV "local" (tests, `TEAM_AUTO_ADMIN=1 npm run dev`): no session means the first admin. */
  TEAM_AUTO_ADMIN?: string;
  /** This deploy's version (wrangler.jsonc version_metadata): part of the bootstrap's ETag. */
  CF_VERSION_METADATA?: { id: string };
  /** Read-only (Account Analytics: Read), for the Usage page and the hourly check (ADR 0059). */
  CLOUDFLARE_ANALYTICS_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  /** The live hub (ADR 0072), wrangler.jsonc durable_objects; a server without one falls back to checking. */
  LIVE?: DurableObjectNamespace;
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
  /**
   * On the record (ADR 0095): a change says what it does to the club's record, or `false` for none. Every route
   * that isn't a GET says (security.test.ts). The wrapper reads `subject` before the handler and again after; when the
   * two differ it writes `event` to the audit log, with who did it, both sides, and `about`.
   */
  audit?: Audit | false;
  handle: (c: Ctx) => Promise<Response>;
}

/** What a change puts on the record (ADR 0095). */
export interface Audit {
  /** The entry's name: "member.updated". The audit page says each in plain words. */
  event: string;
  /** The state the change is to, read the same way before and after. `reply` (the handler's JSON) only after. */
  subject: (c: Ctx, reply?: Record<string, unknown>) => Promise<unknown>;
  /** Which member or role it's about ({ memberId } or { roleId }), so the page can name them. */
  about?: (c: Ctx, reply: Record<string, unknown>) => Record<string, unknown>;
}

/** A route's member, or the one the reply says was made. */
const theMember = (c: Ctx, reply?: Record<string, unknown>) => (reply?.id as number | undefined) ?? id(c);

// ─── The club, in parts ───
// The bootstrap is all of them; a change's reply is the ones it touched. Each is what this member may see (ADR 0036).

// Who may see more than their own (ADR 0036, ADR 0036). Anyone else sees, of anything personal, only their own.
/** Everyone's roles, and every role's actions: who sets them, and who views the app as someone (ADR 0024). */
const SEES_ROLES: readonly Action[] = ["manage:Member", "manage:Role", "impersonate:Member"];
/** Everyone's answers (out as well as in) and the register (no-shows, walk-ins): who runs events and their teams. */
const SEES_REGISTER: readonly Action[] = [
  "record:Attendance",
  "update:Event",
  "generate:Teams",
  "publish:Teams",
  "manage:Member",
  "manage:Tournament",
  "run:Draft",
];
/** Everyone's charges and payments (ADR 0007). Anyone else sees only their own. */
const SEES_DUES: readonly Action[] = ["read:Dues", "record:Payment"];
const holdsAny = (c: Ctx, actions: readonly Action[]) =>
  c.actions.has("manage:all") || actions.some((a) => c.actions.has(a));

/** Who's asking, as the club read needs them: who they are, the day, and what their actions let them see. */
const viewerOf = (c: Ctx): Viewer => ({
  memberId: c.memberId,
  today: c.today,
  // A few weeks back, for what's just been held
  sessionsFrom: new Date(Date.parse(c.today) - 28 * 86_400_000).toISOString().slice(0, 10),
  now: c.now,
  seesRegister: holdsAny(c, SEES_REGISTER),
  seesPrivate: holdsAny(c, ["manage:Member"]),
  seesRoles: holdsAny(c, SEES_ROLES),
  seesRatings: holdsAny(c, ["read:Rating"]),
  // How to reach a team that entered from outside the club: for whoever runs tournaments
  seesContacts: holdsAny(c, ["manage:Tournament"]),
  // A draft night on the agenda: for whoever runs the draft, and that tournament's captains
  runsDraft: can(c.actions, "run:Draft"),
  seesDues: holdsAny(c, SEES_DUES),
});

/** Each part of the club: the rows it's made from (club.ts, read as this member may see them) and how. */
const SLICES = {
  // The role the app opens as, when it isn't your full one (ADR 0024)
  everydayRole: { parts: ["everydayRole"], shape: (_c: Ctx, p: Parts) => (p.everydayRole[0] as number | null) ?? null },
  members: { parts: ["members"], shape: (_c: Ctx, p: Parts) => membersFrom(p.members) },
  // Every role, for whoever sets them; anyone else, only the roles they could hold as they are: their own, and the
  // ones that can do less (their everyday role's choices, ADR 0024). What a stronger role can do isn't theirs to see.
  roles: {
    parts: ["roles", "roleActions"],
    shape: (c: Ctx, p: Parts) => {
      const roles = rolesFrom(p.roles, p.roleActions);
      return holdsAny(c, SEES_ROLES) ? roles : roles.filter((r) => canGrant(c.actions, r.actions));
    },
  },
  venues: { parts: ["venues"], shape: (_c: Ctx, p: Parts) => venuesFrom(p.venues) },
  series: { parts: ["series", "seriesFees"], shape: (_c: Ctx, p: Parts) => seriesFrom(p.series, p.seriesFees) },
  // Each with its answers and published teams
  sessions: {
    parts: ["sessions", "sessionEntries", "sessionTeams"],
    shape: (_c: Ctx, p: Parts) => {
      const rows = p.sessions as SessionRow[];
      const teams = teamsFrom(p.sessionTeams);
      return withEntries(rows, p.sessionEntries).map((s) => ({ ...s, teams: teams.get(s.id) ?? [] }));
    },
  },
  tournamentTypes: { parts: ["tournamentTypes"], shape: (_c: Ctx, p: Parts) => tournamentTypesFrom(p.tournamentTypes) },
  tournaments: {
    parts: ["tournaments", "tournamentTeams", "tournamentPlayers", "games", "goals", "winners", "tournamentEntries"],
    shape: (c: Ctx, p: Parts) =>
      draftSeenBy(
        c,
        withEntries(
          tournamentsFrom(
            p.tournaments,
            p.tournamentTeams,
            p.tournamentPlayers,
            gamesFrom(p.games, p.goals, p.tournamentTeams),
            p.winners,
          ),
          p.tournamentEntries,
        ),
      ),
  },
  clubEvents: {
    parts: ["clubEvents", "eventEntries"],
    shape: (_c: Ctx, p: Parts) => withEntries(clubEventsFrom(p.clubEvents), p.eventEntries),
  },
  // Dues (ADR 0007): your own charges, or everyone's for who sees Unpaid fees; and the quarterly rate
  charges: { parts: ["charges"], shape: (_c: Ctx, p: Parts) => chargesFrom(p.charges) },
  credits: { parts: ["credits"], shape: (_c: Ctx, p: Parts) => p.credits as { memberId: number; pence: number }[] },
  subscriptionFees: {
    parts: ["subscriptionFees"],
    shape: (_c: Ctx, p: Parts) => p.subscriptionFees as { pence: number; from: string }[],
  },
  quips: { parts: ["quips"], shape: (_c: Ctx, p: Parts) => p.quips as { id: number; kind: string; text: string }[] },
  // How often live pages check for updates (ADR 0072)
  settings: { parts: ["settings"], shape: (_c: Ctx, p: Parts) => settingsFrom(p.settings) },
  // What's on from today (ADR 0042)
  agenda: { parts: ["agenda"], shape: (_c: Ctx, p: Parts) => (p.agenda as AgendaRow[]).map(agendaItem) },
} satisfies Record<string, { parts: Part[]; shape: (c: Ctx, p: Parts) => unknown }>;
export type Slice = keyof typeof SLICES;

/**
 * Each event with its answers: who's in and who's waiting, for everyone (that's what a sign-up is for); who said
 * they're out, who didn't turn up and who walked in, only your own, unless you run events (ADR 0036): the club read
 * leaves the rest out.
 */
function withEntries<T extends { id: number }>(rows: T[], entries: Parameters<typeof entriesFrom>[0]) {
  const byEvent = entriesFrom(
    entries,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ ...r, ...byEvent.get(r.id)! }));
}

/**
 * A draft is for its captains and whoever runs it (ADR 0060): who went when is nobody else's business. Anyone else
 * sees the captains and no players while it's on; once it's closed, the teams, with no pick numbers and in an order
 * that says nothing about them (a hash of the team and player, so it's the same every time they look).
 */
function draftSeenBy<T extends ReturnType<typeof tournamentsFrom>[number]>(c: Ctx, tournaments: T[]): T[] {
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

/** Anything on the calendar changed: the agenda comes back with it (ADR 0042). */
const SCHEDULE: readonly Slice[] = ["series", "sessions", "venues", "tournamentTypes", "tournaments", "clubEvents"];

/**
 * The named parts of the club, in one read: D1's round trips are what the app waits on, so it's one statement however
 * many parts (club.ts). The agenda is filled from scratch first if it's empty (a rebuilt database).
 */
async function slices(c: Ctx, names: readonly Slice[]): Promise<Partial<Record<Slice, unknown>>> {
  if (names.includes("agenda")) await ensureAgenda(c.env.DB);
  const parts = await readClub(c.env.DB, viewerOf(c), [...new Set(names.flatMap((n) => SLICES[n].parts))]);
  return Object.fromEntries(names.map((n) => [n, SLICES[n].shape(c, parts)]));
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
    audit: false,
    action: "signup:Event",
    changes: slice === "clubEvents" ? [slice] : [slice, "charges", "credits"],
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
    audit: false,
    action: "update:Event",
    // A past session's line-up is what a player's "played" counts
    changes:
      slice === "sessions"
        ? ["sessions", "members", "charges", "credits"]
        : slice === "tournaments"
          ? [slice, "charges", "credits"]
          : [slice],
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
    path: /^\/api\/live$/,
    action: "authenticated",
    // Changes as they happen, as a stream (ADR 0072): only the names of the parts that changed, from the live hub
    handle: async (c) => liveStream(c.env),
  },
  {
    method: "GET",
    path: /^\/api\/bootstrap$/,
    action: "authenticated",
    // Everything the app shows, in one go: it's a small club. Or a 304 when nothing's changed (ADR 0053).
    handle: async (c) => {
      const db = c.env.DB;
      // The coming training sessions, on the day's first open; the rest of the day's opens skip it. First, so the
      // tag is the club as this reply shows it.
      const today = await dataVersion(db);
      let { version } = today;
      if (today.sessionsMadeOn !== c.today) {
        await ensureSessions(db, c.today);
        // ...and whatever the new day makes due (ADR 0007), in case the hourly check hasn't run yet
        await chargeDue(c.env, new Date(c.now));
        await sessionsMade(db, c.today);
        ({ version } = await dataVersion(db));
      }
      const tag = bootstrapTag(buildOf(c.env), version, c.memberId, c.today);
      if (c.request.headers.get("if-none-match") === tag) return notModified(tag);
      const reply = json({
        me: c.memberId,
        actions: [...c.actions],
        // Dev tools (ADR 0027): outside production, for whoever sets the club's settings
        devTools: devToolsHere(c.env) && (c.actions.has("manage:all") || c.actions.has("manage:Settings")),
        // Screens on demo data (Upload): on dev and locally to try, never in production (#63)
        unfinished: devToolsHere(c.env),
        ...(await slices(c, Object.keys(SLICES) as Slice[])),
      });
      return tagged(reply, tag);
    },
  },
  {
    method: "PUT",
    path: /^\/api\/me$/,
    audit: false,
    action: "authenticated",
    changes: ["members"],
    // Your own phone, position and bio
    handle: async (c) => (await updateProfile(c.env.DB, c.memberId, await body(c.request)), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/me\/everyday-role$/,
    audit: false,
    action: "authenticated",
    changes: ["everydayRole"],
    // { roleId: number | null }: the role the app opens as (ADR 0024)
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
    audit: {
      event: "member.quarterly",
      subject: (c) => quarterlyToday(c.env.DB, id(c), c.today),
      about: (c) => ({ memberId: id(c) }),
    },
    action: "manage:Member",
    changes: ["members", "charges", "credits"],
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
    // Their sign-in email: changing it is a way to become them
    audit: {
      event: "member.email",
      subject: (c) => memberEmail(c.env.DB, id(c)),
      about: (c) => ({ memberId: id(c) }),
    },
    action: "manage:Member",
    changes: ["members"],
    handle: async (c) => (await setContact(c.env.DB, id(c), await body(c.request), c), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/members$/,
    audit: {
      event: "member.added",
      subject: async (c, reply) => (reply ? memberJoined(c.env.DB, theMember(c, reply)) : null),
      about: (c, reply) => ({ memberId: theMember(c, reply) }),
    },
    action: "manage:Member",
    changes: ["members"],
    // { name, email, position }: in the club now, and emailed a link to the app (ADR 0069)
    handle: async (c) => json(await addMember(c.env, await body(c.request), new URL(c.request.url).origin, c), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/members\/(\d+)$/,
    // Whether they're in, and their roles: who can do what
    audit: {
      event: "member.updated",
      subject: (c) => memberStanding(c.env.DB, id(c)),
      about: (c) => ({ memberId: id(c) }),
    },
    action: "manage:Member",
    changes: ["members"],
    handle: async (c) => (await updateMember(c.env.DB, id(c), await body(c.request), c), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/roles$/,
    audit: {
      event: "role.created",
      subject: async (c, reply) => (reply ? roleSummary(c.env.DB, reply.id as number) : null),
      about: (_, reply) => ({ roleId: reply.id }),
    },
    action: "manage:Role",
    changes: ["roles"],
    handle: async (c) => json({ id: await createRole(c.env.DB, await body(c.request), c) }, 201),
  },
  {
    method: "PUT",
    path: /^\/api\/roles\/(\d+)$/,
    audit: {
      event: "role.updated",
      subject: (c) => roleSummary(c.env.DB, id(c)),
      about: (c) => ({ roleId: id(c) }),
    },
    action: "manage:Role",
    changes: ["roles", "members"],
    handle: async (c) => (await updateRole(c.env.DB, id(c), await body(c.request), c), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/venues$/,
    audit: false,
    action: "manage:Venue",
    changes: ["venues"],
    handle: async (c) => json(await createVenue(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/venues\/(\d+)$/,
    audit: false,
    action: "manage:Venue",
    changes: ["venues"],
    handle: async (c) => (await updateVenue(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/series$/,
    audit: false,
    action: "manage:Training",
    changes: ["series", "sessions", "charges", "credits"],
    handle: async (c) => {
      const b = await body(c.request);
      const made = await createSeries(c.env.DB, b, c.today);
      // A new training is free until whoever sets fees says otherwise
      if (can(c.actions, "manage:Fees")) await setSeriesFees(c.env.DB, made.id, b.fees, c.actions);
      return json(made, 201);
    },
  },
  {
    method: "PUT",
    path: /^\/api\/series\/(\d+)$/,
    audit: false,
    action: "manage:Training",
    changes: ["series", "sessions", "charges", "credits"],
    // Its fees too, for whoever sets fees (ADR 0007)
    handle: async (c) => {
      const b = await body(c.request);
      await setSeriesFees(c.env.DB, id(c), b.fees, c.actions);
      await updateSeries(c.env.DB, id(c), b, c.today);
      return ok();
    },
  },
  {
    method: "POST",
    path: /^\/api\/series\/(\d+)\/more$/,
    audit: false,
    action: "manage:Training",
    changes: ["sessions"],
    handle: async (c) => (await moreSessions(c.env.DB, id(c), c.today), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/sessions\/(\d+)\/cancelled$/,
    audit: false,
    action: "manage:Training",
    changes: ["sessions", "members", "charges", "credits"],
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
    audit: false,
    action: "manage:Tournament",
    changes: ["tournamentTypes"],
    handle: async (c) => json(await createTournamentType(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/tournament-types\/(\d+)$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournamentTypes"],
    handle: async (c) => (await updateTournamentType(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments", "charges", "credits"],
    handle: async (c) => json(await createTournament(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments", "charges", "credits"],
    handle: async (c) => (await updateTournament(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)$/,
    audit: { event: "tournament.deleted", subject: (c) => tournamentSummary(c.env.DB, id(c)) },
    action: "manage:Tournament",
    changes: ["tournaments", "charges", "credits"],
    // Gone, with its teams, sign-ups, games, awards and charges (Settings → Tournaments)
    handle: async (c) => (await deleteTournament(c.env.DB, id(c)), ok()),
  },
  {
    method: "GET",
    path: /^\/api\/usage$/,
    action: "read:Usage",
    // Today's use of the club's free Cloudflare allowance (ADR 0059)
    handle: async (c) => json(await readUsage(c.env, new Date(c.now))),
  },
  {
    method: "GET",
    path: /^\/api\/audit$/,
    action: "read:Audit",
    // The record, newest first (ADR 0095): ?before=<id> for the page after, ?limit= up to 200
    handle: async (c) => {
      const q = new URL(c.request.url).searchParams;
      const before = q.get("before");
      const limit = q.get("limit");
      if ((before && !/^\d+$/.test(before)) || (limit && !/^\d+$/.test(limit)))
        throw new HttpError(400, "before and limit should be whole numbers.");
      return json(
        await readAudit(c.env.DB, {
          before: before ? Number(before) : null,
          limit: limit ? Number(limit) : AUDIT_PAGE,
        }),
      );
    },
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)\/winners$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // { winners: [{ award, teamId | memberId }] }: who won the tournament's awards (ADR 0044)
    handle: async (c) => (await setWinners(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/settings$/,
    audit: false,
    action: "manage:Settings",
    changes: ["settings"],
    // { liveRefreshSeconds }: how often live pages check for updates (ADR 0072)
    handle: async (c) => (await saveSettings(c.env.DB, await body(c.request)), ok()),
  },
  // Dev tools (ADR 0027): who gets their own email outside production. Not there at all in production.
  {
    method: "GET",
    path: /^\/api\/dev\/mail$/,
    action: "manage:Settings",
    handle: async (c) => json({ addresses: await devMailList(c.env) }),
  },
  {
    method: "POST",
    path: /^\/api\/dev\/mail$/,
    // Who gets their own email outside production
    audit: { event: "dev_mail.changed", subject: (c) => devMailList(c.env) },
    action: "manage:Settings",
    // A club setting, read on its own page (GET /api/dev/mail)
    changes: ["settings"],
    handle: async (c) => (await addDevMail(c.env, await body(c.request), c.memberId, c.now), ok()),
  },
  {
    method: "DELETE",
    path: /^\/api\/dev\/mail$/,
    audit: { event: "dev_mail.changed", subject: (c) => devMailList(c.env) },
    action: "manage:Settings",
    // A club setting, read on its own page (GET /api/dev/mail)
    changes: ["settings"],
    handle: async (c) => (await removeDevMail(c.env, await body(c.request)), ok()),
  },
  ...ENTRY_ROUTES,
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/draft\/picks$/,
    audit: false,
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
    audit: false,
    action: "run:Draft",
    changes: ["tournaments"],
    handle: async (c) => (await undoPick(c.env.DB, id(c)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/fixtures$/,
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // The round robin and its playoffs, once the teams are set (ADR 0061)
    handle: async (c) => (await makeFixtures(c.env.DB, id(c)), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)$/,
    audit: false,
    action: "score:Match",
    changes: ["tournaments"],
    // A game's final score; the last group result fills the playoffs
    handle: async (c) => (await scoreGame(c.env.DB, id(c), Number(c.params[1]), await body(c.request)), ok()),
  },
  // Scoring a game as it's played (ADR 0061): whoever holds the scoresheet
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/scorer$/,
    audit: false,
    action: "authenticated",
    changes: ["tournaments"],
    // { action: "claim" | "release" }: Start scoring, or let it go
    handle: async (c) => (await holdScoresheet(c.env.DB, id(c), Number(c.params[1]), await body(c.request), c), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/clock$/,
    audit: false,
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
    audit: false,
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
    audit: false,
    action: "authenticated",
    changes: ["tournaments"],
    handle: async (c) => (await undoGoal(c.env.DB, id(c), Number(c.params[1]), c), ok()),
  },
  {
    method: "DELETE",
    path: /^\/api\/tournaments\/(\d+)\/games\/(\d+)\/goals\/(\d+)$/,
    audit: false,
    action: "authenticated",
    changes: ["tournaments"],
    // An admin takes any goal off a finished game (scoring.ts decides who)
    handle: async (c) => (await removeGoal(c.env.DB, id(c), Number(c.params[1]), Number(c.params[2]), c), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/draft\/open$/,
    audit: false,
    action: "run:Draft",
    changes: ["tournaments"],
    // The night of the draft: the captains can pick (ADR 0060)
    handle: async (c) => (await openDraft(c.env.DB, id(c)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/draft\/close$/,
    audit: false,
    action: "run:Draft",
    changes: ["tournaments"],
    // Everyone's picked (or the rest are left out on purpose): the teams are locked
    handle: async (c) => (await closeDraft(c.env.DB, id(c), (await body(c.request)).leaveOut === true), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/tournaments\/(\d+)\/teams\/(\d+)\/look$/,
    audit: false,
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
    audit: false,
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
    audit: false,
    action: "manage:Tournament",
    changes: ["tournaments"],
    // Off the team, still signed up
    handle: async (c) => (await takeOffTeam(c.env.DB, id(c), Number(c.params[1]), Number(c.params[2])), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/tournaments\/(\d+)\/draft\/reset$/,
    audit: { event: "draft.reset", subject: (c) => draftProgress(c.env.DB, id(c)) },
    action: "run:Draft",
    changes: ["tournaments"],
    // Start again: the picks (and any fixtures) go, the sign-ups and captains stay
    handle: async (c) => (await resetDraft(c.env.DB, id(c)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/sessions\/(\d+)\/teams$/,
    audit: false,
    action: "publish:Teams",
    changes: ["sessions"],
    handle: async (c) => (await publishTeams(c.env.DB, id(c), await body(c.request), c.memberId, c.now), ok()),
  },
  {
    method: "DELETE",
    path: /^\/api\/sessions\/(\d+)\/teams$/,
    audit: false,
    action: "publish:Teams",
    changes: ["sessions"],
    // Take the teams down; the sign-ups stay
    handle: async (c) => (await removeTeams(c.env.DB, id(c)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/sessions\/(\d+)\/reset$/,
    audit: { event: "session.reset", subject: (c) => sessionSignups(c.env.DB, id(c)) },
    action: "update:Event",
    changes: ["sessions", "charges", "credits"],
    // Start the session again: no sign-ups, no teams
    handle: async (c) => (await resetSession(c.env.DB, id(c)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/quips$/,
    audit: false,
    action: "manage:Quip",
    changes: ["quips"],
    handle: async (c) => json(await createQuip(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/quips\/(\d+)$/,
    audit: false,
    action: "manage:Quip",
    changes: ["quips"],
    handle: async (c) => (await updateQuip(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "DELETE",
    path: /^\/api\/quips\/(\d+)$/,
    audit: false,
    action: "manage:Quip",
    changes: ["quips"],
    handle: async (c) => (await deleteQuip(c.env.DB, id(c)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/sessions\/(\d+)\/register$/,
    audit: false,
    action: "record:Attendance",
    // Who came is who's charged (ADR 0007)
    changes: ["sessions", "members", "charges", "credits"],
    // The register on the night: here or not
    handle: async (c) => {
      const { b, memberId } = await memberIdIn(c);
      if (typeof b.here !== "boolean") throw new HttpError(400, "here should be true or false.");
      await mark(c.env.DB, id(c), memberId, b.here, c.memberId, c.now);
      return ok();
    },
  },
  // Dues (ADR 0007)
  {
    method: "POST",
    path: /^\/api\/subscription-fees$/,
    audit: { event: "fees.quarterly", subject: (c) => subscriptionFees(c.env.DB) },
    action: "manage:Fees",
    changes: ["subscriptionFees", "charges", "credits"],
    // { pence, from }: the quarterly rate from a date
    handle: async (c) => (await setSubscriptionFee(c.env.DB, await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/members\/(\d+)\/charges$/,
    audit: {
      event: "charge.added",
      subject: async (c, reply) => (reply ? chargeState(c.env.DB, reply.id as number) : null),
      about: (c) => ({ memberId: id(c) }),
    },
    action: "record:Payment",
    changes: ["charges", "credits"],
    // { quarter: "2026-Q3", pence? }: they owe for a quarter
    handle: async (c) => json(await addQuarterCharge(c.env.DB, id(c), await body(c.request), c.memberId, c.now), 201),
  },
  {
    method: "DELETE",
    path: /^\/api\/charges\/(\d+)$/,
    audit: {
      event: "charge.removed",
      subject: (c) => chargeState(c.env.DB, id(c)),
      about: (c, reply) => ({ memberId: reply.memberId }),
    },
    action: "record:Payment",
    changes: ["charges", "credits"],
    // A quarter charged by hand by mistake
    handle: async (c) => {
      const was = await chargeState(c.env.DB, id(c));
      await removeCharge(c.env.DB, id(c));
      return json({ ok: true, memberId: was?.memberId });
    },
  },
  {
    method: "POST",
    path: /^\/api\/charges\/(\d+)\/payment$/,
    audit: {
      event: "charge.paid",
      subject: (c) => chargeState(c.env.DB, id(c)),
      about: (c, reply) => ({ memberId: reply.memberId }),
    },
    action: "record:Payment",
    changes: ["charges", "credits"],
    // { via: "transfer" | "cash" }: paid
    handle: async (c) => {
      await payCharge(c.env.DB, id(c), await body(c.request), c.memberId, c.now);
      return json({ ok: true, memberId: (await chargeState(c.env.DB, id(c)))?.memberId });
    },
  },
  {
    method: "DELETE",
    path: /^\/api\/charges\/(\d+)\/payment$/,
    audit: {
      event: "charge.paid",
      subject: (c) => chargeState(c.env.DB, id(c)),
      about: (c, reply) => ({ memberId: reply.memberId }),
    },
    action: "record:Payment",
    changes: ["charges", "credits"],
    // Marked paid by mistake
    handle: async (c) => {
      await unpayCharge(c.env.DB, id(c));
      return json({ ok: true, memberId: (await chargeState(c.env.DB, id(c)))?.memberId });
    },
  },
  {
    method: "POST",
    path: /^\/api\/members\/(\d+)\/payments$/,
    audit: {
      event: "member.paid",
      subject: (c) => unpaidOf(c.env.DB, id(c)),
      about: (c) => ({ memberId: id(c) }),
    },
    action: "record:Payment",
    changes: ["charges", "credits"],
    // { via }: Mark all paid; { via, pence }: a lump sum, paying the oldest first (FIFO), the rest kept as credit
    handle: async (c) => (await payAll(c.env.DB, id(c), await body(c.request), c.memberId, c.now), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/club-events$/,
    audit: false,
    action: "create:Event",
    changes: ["clubEvents"],
    handle: async (c) => json(await createClubEvent(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "POST",
    path: /^\/api\/members\/(\d+)\/recalculate$/,
    audit: false,
    action: "record:Payment",
    changes: ["charges", "credits"],
    // Their dues worked out again from who came and the fees as they are now (the wrapper does it, as after any
    // change to charges); everyone's come out the same way
    handle: async (c) => (await memberExists(c.env.DB, id(c)), ok()),
  },
  {
    method: "PUT",
    path: /^\/api\/club-events\/(\d+)$/,
    audit: false,
    action: "update:Event",
    changes: ["clubEvents"],
    handle: async (c) => (await updateClubEvent(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/club-events\/(\d+)\/cancelled$/,
    audit: false,
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

/** Who's asking: their session, or (on your own machine, when asked for) the first admin. */
async function whoIs(request: Request, env: Env, now: Date): Promise<{ memberId: number; setCookie?: string } | null> {
  const session = await sessionOf(request, env, now);
  if (session) return session;
  // Only on a private address (ADR 0023): a build that said "local" by mistake still opens to nobody
  if (localHere(env, request) && env.TEAM_AUTO_ADMIN === "1") {
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
    // A generous limit per address (ADR 0055); sign-in and changes have tighter ones of their own
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
    if (action !== "authenticated" && !actions.has("manage:all") && !actions.has(action)) {
      // Refused for want of an action: on the record (ADR 0024), so poking at admin routes is seen
      await audit(env.DB, now, memberId, "refused", { method: request.method, path: url.pathname, action });
      return json({ error: "Your role can't do that." }, 403);
    }
    const ctx: Ctx = {
      env,
      request,
      params: hit.m!.slice(1),
      memberId,
      actions,
      today: londonToday(now),
      now: now.toISOString(),
    };
    // On the record (ADR 0095): what the change is to, before it
    const record = writes && hit.r.audit ? hit.r.audit : null;
    const before = record ? await record.subject(ctx) : undefined;
    // A finished tournament's result is on the website's pages (ADR 0100): a change to it, or one that finishes it,
    // wants a rebuild. Read before too, so deleting one or making it private counts.
    const tournament = writes ? tournamentOfPath(url.pathname) : null;
    const wasOnWebsite = tournament ? await onTheWebsite(env.DB, tournament) : false;
    const res = await hit.r.handle(ctx);
    if (record && res.ok) {
      const reply = (await res
        .clone()
        .json()
        .catch(() => ({}))) as Record<string, unknown>;
      const after = await record.subject(ctx, reply);
      if (JSON.stringify(before ?? null) !== JSON.stringify(after ?? null))
        await audit(env.DB, now, memberId, record.event, {
          ...record.about?.(ctx, reply),
          from: before ?? null,
          to: after ?? null,
        });
    }
    if (tournament && res.ok && (wasOnWebsite || (await onTheWebsite(env.DB, tournament))))
      await wantRebuild(env.DB, now);
    if (writes && res.ok && hit.r.changes?.includes("charges")) {
      // Who came, a fee or a quarterly membership changed: so may what people owe (ADR 0007)
      await chargeAttendance(env.DB, ctx.today, ctx.now);
      await chargeQuarters(env.DB, ctx.today, ctx.now);
    }
    if (writes && res.ok) {
      // A change: every member's bootstrap is out of date (ADR 0053)
      await bumpDataVersion(env.DB);
      // ...and this member gets the parts it touched back, to put in place
      const declared = hit.r.changes ?? [];
      const changes = declared.some((d) => SCHEDULE.includes(d)) ? [...declared, "agenda" as const] : declared;
      // ...and everyone on a live page hears which parts (ADR 0072), once this reply is on its way
      const told = notifyLive(env, changes);
      if (waitUntil) waitUntil(told);
      else await told;
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
