// Sample data for the clickable shell. Nothing here is a club fact: names, fees and dates are made up and
// replaced by D1 data from T1 on.
import type { Action } from "../access/actions";
import type { OneOff, Tournament, TournamentType, TrainingSeries } from "./model";

export type Position = "F" | "D";

export interface Player {
  id: number;
  name: string;
  position: Position;
  rating: number;
  cougar: boolean;
}

const NAMES = [
  "Alex Moran",
  "Sam Okafor",
  "Jo Lindqvist",
  "Chris Patel",
  "Robin Hale",
  "Dani Kowalski",
  "Max Adeyemi",
  "Charlie Byrne",
  "Jamie Novak",
  "Toni Reyes",
  "Kit Harrow",
  "Lee Fontaine",
  "Ash Mbeki",
  "Morgan Steele",
  "Pat Quinlan",
  "Rowan Tse",
  "Frankie Doyle",
  "Jess Varga",
  "Nico Bassi",
  "Sky Larsen",
  "Remy Clarke",
];

export const PLAYERS: Player[] = NAMES.map((name, i) => ({
  id: i + 1,
  name,
  position: i % 3 === 0 ? "D" : "F",
  rating: 50 + ((i * 37) % 45),
  cougar: i % 4 === 0,
}));

/** Who you really are in the demo: the first admin. */
export const REAL_ID = PLAYERS[0].id;

export const emailFor = (p: Player) => `${p.name.toLowerCase().replace(" ", ".")}@example.com`;
export const referenceFor = (id: number) => `COU-${String(id).padStart(4, "0")}`;

// ─── Schedule (ADR 0028). Sample values, not club facts. ───

export const SERIES: TrainingSeries[] = [
  {
    id: 1,
    slug: "friday",
    name: "Friday Training",
    shortName: "Friday",
    icon: "stick",
    tone: "blue",
    repeatEvery: 1,
    weekdays: ["fri"],
    startsOn: "2026-09-04",
    endsOn: null,
    startTime: "19:30",
    endTime: "21:30",
    venue: "The rink",
    capacity: 28,
    public: true,
    active: true,
  },
];

export const TOURNAMENT_TYPES: TournamentType[] = [
  {
    id: 1,
    slug: "kumite",
    name: "The Cougars Kumite",
    shortName: "Kumite",
    icon: "swords",
    tone: "red",
    format: "round_robin",
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    gameMinutes: 12,
    draft: true,
    active: true,
  },
];

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const TOURNAMENTS: Tournament[] = [
  {
    id: 1,
    typeId: 1,
    name: "Summer Kumite",
    location: "The rink",
    heldOn: inDays(-70),
    startTime: "11:00",
    endTime: "16:00",
    capacity: 24,
    status: "finished",
    champions: "Red",
    going: [],
    waitlist: [],
  },
  {
    id: 2,
    typeId: 1,
    name: "Autumn Kumite",
    location: "The rink",
    heldOn: inDays(0),
    startTime: "11:00",
    endTime: "16:00",
    capacity: 24,
    status: "live",
    going: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    waitlist: [],
  },
  {
    id: 3,
    typeId: 1,
    name: "Winter Kumite",
    location: "The rink",
    heldOn: inDays(56),
    startTime: "11:00",
    endTime: "16:00",
    capacity: 24,
    status: "open",
    going: [2, 3, 5, 8, 13],
    waitlist: [],
  },
];

export const ONE_OFFS: OneOff[] = [
  {
    id: 1,
    title: "End-of-season drinks",
    startsAt: `${inDays(15)}T19:00:00Z`,
    endsAt: `${inDays(15)}T22:00:00Z`,
    venue: "The pub",
    signup: false,
    going: [],
    waitlist: [],
  },
];

/** Sample sign-ups for the next two sessions of the first series. */
export const SAMPLE_SIGNUPS = [PLAYERS.slice(1, 17).map((p) => p.id), PLAYERS.slice(3, 9).map((p) => p.id)];

export interface Role {
  id: number;
  name: string;
  description: string;
  system: boolean;
  actions: Action[];
}

const MEMBER: Action[] = ["read:Event", "signup:Event"];

export const ROLES: Role[] = [
  { id: 1, name: "Member", description: "Everyone approved", system: false, actions: MEMBER },
  {
    id: 2,
    name: "Contributor",
    description: "Uploads photos and videos",
    system: false,
    actions: [...MEMBER, "upload:Photo", "upload:Video"],
  },
  {
    id: 3,
    name: "Door",
    description: "Runs the register on Fridays",
    system: false,
    actions: [...MEMBER, "record:Attendance"],
  },
  { id: 4, name: "Admin", description: "Runs the club", system: true, actions: ["manage:all"] },
];

export interface MemberRow {
  player: Player;
  status: "pending" | "active";
  roles: string[];
  plan: "Subscription" | "Pay as you go";
}

export const MEMBERS: MemberRow[] = [
  ...[
    { name: "Jordan Pike", position: "F" as const },
    { name: "Casey Arden", position: "D" as const },
  ].map((p, i) => ({
    player: { id: 900 + i, name: p.name, position: p.position, rating: 0, cougar: false },
    status: "pending" as const,
    roles: [],
    plan: "Pay as you go" as const,
  })),
  ...PLAYERS.map((player, i) => ({
    player,
    status: "active" as const,
    roles: i === 0 ? ["Admin"] : i === 4 ? ["Contributor"] : i === 7 ? ["Door"] : ["Member"],
    plan: i % 2 ? ("Subscription" as const) : ("Pay as you go" as const),
  })),
];

export const FEES = [
  { kind: "Quarterly subscription", amountPence: 9000, from: "2026-07-01" },
  { kind: "Per session", amountPence: 1000, from: "2026-07-01" },
  { kind: "Per session", amountPence: 800, from: "2025-09-01", superseded: true },
];

/** Age buckets for Overdue Rentals, oldest unpaid charge decides. */
export const BUCKETS = ["Due back", "Late", "Very late", "Lost tape"] as const;
export const BUCKET_HINT = ["0–30 days", "31–60", "61–90", "over 90"];

export const OVERDUE = PLAYERS.slice(1, 10)
  .map((p, i) => {
    const amounts = [0, 0, 0, 0];
    amounts[i % 4] = 1000 * ((i % 3) + 1);
    if (i % 3 === 0) amounts[0] += 1000;
    return {
      player: p,
      amounts,
      total: amounts.reduce((a, b) => a + b, 0),
      reference: `COU-${String(p.id).padStart(4, "0")}`,
    };
  })
  .sort((a, b) => b.amounts.findLastIndex((x) => x > 0) - a.amounts.findLastIndex((x) => x > 0) || b.total - a.total);

/** A member's ledger: three Fridays and a payment, topped up to what Overdue Rentals says they owe. */
export function ledgerFor(id: number) {
  const owed = OVERDUE.find((r) => r.player.id === id)?.total ?? (id === REAL_ID ? 2000 : 0);
  const lines = [
    { date: "2026-09-18", what: "Friday hockey", pence: 1000 },
    { date: "2026-09-25", what: "Friday hockey", pence: 1000 },
    { date: "2026-09-28", what: `Bank transfer, ${referenceFor(id)}`, pence: -2000 },
  ];
  if (owed > 0) lines.push({ date: "2026-10-02", what: "Friday hockey", pence: owed });
  return lines;
}

/** The old app's names: the Cougar players' team is "Cougars", the rest are colours (archive/team-manager). */
export const TEAM_NAMES = ["Cougars", "White", "Black", "Red", "Gold"];
/** Display order, also from the old app: Cougars, then Black, then White. */
export const TEAM_ORDER: Record<string, number> = { Cougars: 0, Black: 1, White: 2, Red: 3, Gold: 4 };
