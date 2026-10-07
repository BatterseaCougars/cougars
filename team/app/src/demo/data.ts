// The club's data as the app holds it: filled from D1 by /api/bootstrap before the app mounts (app/backend.ts),
// and refreshed after each change. The shapes match the D1 tables (docs/team-app-data-model.md).
import type { Action } from "../access/actions";
import type { OneOff, Tournament, TournamentType, TrainingSeries, TrainingSession } from "./model";
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
  /** Training sessions they came to. */
  played?: number;
}

/** Everyone in the club. Filled by hydrate(). */
export const PLAYERS: Player[] = [];

/** Who you really are (the signed-in member). */
export let REAL_ID = 0;
/** The role you run the app as day to day, if not your full one (ADR 0037). Read once by session.svelte.ts. */
export let EVERYDAY_ROLE: number | null = null;

const EMAILS = new Map<number, string | null>();
const REFERENCES = new Map<number, string | null>();
const PHONES = new Map<number, string | null>();
/** Only yours, unless you manage members. */
export const phoneFor = (id: number) => PHONES.get(id) ?? null;
export const emailFor = (p: Player) => EMAILS.get(p.id) ?? "No email yet";
export const referenceFor = (id: number) => REFERENCES.get(id) ?? `COU-${String(id).padStart(4, "0")}`;

export const SERIES: TrainingSeries[] = [];
export const SESSIONS: TrainingSession[] = [];
export const TOURNAMENT_TYPES: TournamentType[] = [];
export const TOURNAMENTS: Tournament[] = [];
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
  /** A Quarterly Member today, from `subscriptions` (ADR 0034); everyone else pays as they go. */
  plan: "Subscription" | "Pay as you go";
}
export const MEMBERS: MemberRow[] = [];

/** The quarterly subscription, from a date. Set up with dues (T4). */
export const FEES: { kind: string; amountPence: number; from: string; superseded?: boolean }[] = [];

/** What /api/bootstrap sends (team/app/worker/api.ts). */
export interface Bootstrap {
  me: number;
  actions: Action[];
  /** The role the app opens as, when it isn't your full one (ADR 0037). */
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
    phone: string | null;
    played: number;
    quarterly: boolean;
  }[];
  roles: Role[];
  series: TrainingSeries[];
  sessions: (TrainingSession & { teams: Team[] })[];
  tournamentTypes: TournamentType[];
  tournaments: Tournament[];
  clubEvents: OneOff[];
  quips: Quip[];
}

/** Home's lines, from D1. */
export const QUIPS: Quip[] = [];
/** Published teams, by session id. */
export const TEAMS: Record<number, Team[]> = {};

const fill = <T>(list: T[], items: T[]) => list.splice(0, list.length, ...items);

/** Put the club's data in place. Runs before the app mounts, and again after each change. */
export function hydrate(b: Bootstrap) {
  REAL_ID = b.me;
  EVERYDAY_ROLE = b.everydayRole ?? null;
  EMAILS.clear();
  REFERENCES.clear();
  PHONES.clear();
  const players = b.members.map((m) => {
    EMAILS.set(m.id, m.email);
    REFERENCES.set(m.id, m.paymentReference);
    PHONES.set(m.id, m.phone);
    const { id, name, position, rating, cougar, bio, played } = m;
    return { id, name, position, rating, cougar, bio, played };
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
  fill(ROLES, b.roles);
  fill(SERIES, b.series);
  fill(
    SESSIONS,
    b.sessions.map(({ teams: _, ...s }) => s),
  );
  for (const k of Object.keys(TEAMS)) delete TEAMS[Number(k)];
  for (const s of b.sessions) if (s.teams.length) TEAMS[s.id] = s.teams;
  fill(QUIPS, b.quips);
  fill(TOURNAMENT_TYPES, b.tournamentTypes);
  fill(TOURNAMENTS, b.tournaments);
  fill(ONE_OFFS, b.clubEvents);
}

/** The old app's names: the Cougar players' team is "Cougars", the rest are colours (archive/team-manager). */
export const TEAM_NAMES = ["Cougars", "White", "Black", "Red", "Gold"];
/** Display order, also from the old app: Cougars, then Black, then White. */
export const TEAM_ORDER: Record<string, number> = { Cougars: 0, Black: 1, White: 2, Red: 3, Gold: 4 };
