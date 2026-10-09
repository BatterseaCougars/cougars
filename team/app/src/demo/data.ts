// The club's data as the app holds it: filled from D1 by /api/bootstrap before the app mounts (app/backend.ts);
// after a change, only the parts it touched come back and are put in place (applySlices). The shapes match the D1 tables (docs/team-app-data-model.md).
import type { Action } from "../access/actions";
import type { AgendaRow, OneOff, Tournament, TournamentType, TrainingSeries, TrainingSession, Venue } from "./model";
import type { Quip } from "../lib/quips";
import type { Team } from "../lib/snake";

export type Position = "F" | "D" | "G";
export const POSITIONS: Record<Position, string> = { F: "Forward", D: "Defence", G: "Keeper" };

export interface Player {
  id: number;
  name: string;
  position: Position;
  rating: number;
  cougar: boolean;
  /** On the back of their card. */
  bio?: string;
  /** How their name shows on the website roster; null: first name and initial. */
  webName?: string | null;
  /** Training sessions they came to. */
  played?: number;
}

/** Everyone in the club. Filled by hydrate(). */
export const PLAYERS: Player[] = [];

/** Who you really are (the signed-in member). */
export let REAL_ID = 0;
/** Dev tools are here (outside production, for whoever sets the club's settings; ADR 0027). */
export let DEV_TOOLS = false;
/** The role you run the app as day to day, if not your full one (ADR 0024). Read once by session.svelte.ts. */
export let EVERYDAY_ROLE: number | null = null;

const EMAILS = new Map<number, string | null>();
const REFERENCES = new Map<number, string | null>();
const PHONES = new Map<number, string | null>();
/** Only yours, unless you manage members. */
export const phoneFor = (id: number) => PHONES.get(id) ?? null;
export const emailFor = (p: Player) => EMAILS.get(p.id) ?? "No email yet";
/** Their bank reference (ADR 0007), or a dash: one that isn't sent is never made up, as it's what they pay with. */
export const referenceFor = (id: number) => REFERENCES.get(id) ?? "—";

export const VENUES: Venue[] = [];
export const SERIES: TrainingSeries[] = [];
export const SESSIONS: TrainingSession[] = [];
export const TOURNAMENT_TYPES: TournamentType[] = [];
export const TOURNAMENTS: Tournament[] = [];
/** The club's agenda, from today (ADR 0042). */
export const AGENDA: AgendaRow[] = [];
/** The club's settings for the app (ADR 0072): how often live pages check for updates. */
export const SETTINGS = { liveRefreshSeconds: 10 };
export const ONE_OFFS: OneOff[] = [];

export interface Role {
  id: number;
  name: string;
  description: string;
  system: boolean;
  actions: Action[];
}
export const ROLES: Role[] = [];

export interface MemberRow {
  player: Player;
  status: "pending" | "active" | "inactive";
  /** Highest first: Admin, then the others, Member last. */
  roles: string[];
  /** A Quarterly Member today, from `subscriptions` (ADR 0007); everyone else pays as they go. */
  plan: "Subscription" | "Pay as you go";
}
export const MEMBERS: MemberRow[] = [];

/** The quarterly subscription, from a date. Set up with dues (T4). */
export const FEES: { kind: string; amountPence: number; from: string; superseded?: boolean }[] = [];

/** What /api/bootstrap sends (team/app/worker/api.ts). */
export interface Bootstrap {
  me: number;
  actions: Action[];
  devTools?: boolean;
  /** The role the app opens as, when it isn't your full one (ADR 0024). */
  everydayRole: number | null;
  members: {
    id: number;
    name: string;
    email: string | null;
    position: Position;
    rating: number;
    cougar: boolean;
    status: MemberRow["status"];
    paymentReference: string | null;
    roles: string[];
    bio: string;
    webName: string | null;
    phone: string | null;
    played: number;
    quarterly: boolean;
  }[];
  roles: Role[];
  venues: Venue[];
  series: TrainingSeries[];
  sessions: (TrainingSession & { teams: Team[] })[];
  tournamentTypes: TournamentType[];
  tournaments: Tournament[];
  clubEvents: OneOff[];
  quips: Quip[];
  /** What's on from today (ADR 0042). */
  agenda: AgendaRow[];
  settings: { liveRefreshSeconds: number };
}

/** Home's lines, from D1. */
export const QUIPS: Quip[] = [];
/** Published teams, by session id. */
export const TEAMS: Record<number, Team[]> = {};

const fill = <T>(list: T[], items: T[]) => list.splice(0, list.length, ...items);

/** The parts of the club's data that a change sends back (worker/api.ts SLICES): all of it but who you are. */
export type Slices = Partial<Omit<Bootstrap, "me" | "actions" | "devTools">>;

/** Put the club's data in place. Runs before the app mounts, and again whenever the whole club is reloaded. */
export function hydrate(b: Bootstrap) {
  REAL_ID = b.me;
  DEV_TOOLS = !!b.devTools;
  applySlices(b);
}

/** Put the parts of the club's data that came back in place; the rest stays as it is. */
export function applySlices(b: Slices) {
  if (b.everydayRole !== undefined) EVERYDAY_ROLE = b.everydayRole;
  if (b.members) {
    EMAILS.clear();
    REFERENCES.clear();
    PHONES.clear();
    const players = b.members.map((m) => {
      EMAILS.set(m.id, m.email);
      REFERENCES.set(m.id, m.paymentReference);
      PHONES.set(m.id, m.phone);
      const { id, name, position, rating, cougar, bio, webName, played } = m;
      return { id, name, position, rating, cougar, bio, webName, played };
    });
    fill(PLAYERS, players);
    fill(
      MEMBERS,
      b.members.map((m, i) => ({
        player: players[i],
        status: m.status,
        roles: m.roles,
        plan: m.quarterly ? ("Subscription" as const) : ("Pay as you go" as const),
      })),
    );
  }
  if (b.roles) fill(ROLES, b.roles);
  if (b.venues) fill(VENUES, b.venues);
  if (b.series) fill(SERIES, b.series);
  if (b.sessions) {
    fill(
      SESSIONS,
      b.sessions.map(({ teams: _, ...s }) => s),
    );
    for (const k of Object.keys(TEAMS)) delete TEAMS[Number(k)];
    for (const s of b.sessions) if (s.teams.length) TEAMS[s.id] = s.teams;
  }
  if (b.quips) fill(QUIPS, b.quips);
  if (b.tournamentTypes) fill(TOURNAMENT_TYPES, b.tournamentTypes);
  if (b.tournaments) fill(TOURNAMENTS, b.tournaments);
  if (b.clubEvents) fill(ONE_OFFS, b.clubEvents);
  if (b.agenda) fill(AGENDA, b.agenda);
  if (b.settings) Object.assign(SETTINGS, b.settings);
}

/** The old app's names: the Cougar players' team is "Cougars", the rest are colours (archive/team-manager). */
export const TEAM_NAMES = ["Cougars", "White", "Black", "Red", "Gold"];
/** Display order, also from the old app: Cougars, then Black, then White. */
export const TEAM_ORDER: Record<string, number> = { Cougars: 0, Black: 1, White: 2, Red: 3, Gold: 4 };
