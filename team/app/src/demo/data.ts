// Sample data for the clickable shell. Nothing here is a club fact: names, fees and dates are made up and
// replaced by D1 data from T1 on.
import type { Action } from "../access/actions";

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

export interface ClubEvent {
  id: number;
  kind: "friday" | "kumite" | "social";
  title: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  signup: boolean;
  capacity?: number;
  going: number[];
  waitlist: number[];
}

/** The next eight Fridays at 19:30 London time, plus a Kumite and a social. */
function upcoming(): ClubEvent[] {
  const events: ClubEvent[] = [];
  const d = new Date();
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  for (let i = 0; i < 8; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i * 7);
    const ymd = day.toISOString().slice(0, 10);
    events.push({
      id: 100 + i,
      kind: "friday",
      title: "Friday hockey",
      startsAt: `${ymd}T18:30:00Z`,
      endsAt: `${ymd}T20:30:00Z`,
      venue: "The rink",
      signup: true,
      capacity: 28,
      going: i === 0 ? PLAYERS.slice(1, 17).map((p) => p.id) : i === 1 ? PLAYERS.slice(3, 9).map((p) => p.id) : [],
      waitlist: [],
    });
  }
  const kumite = new Date(d);
  kumite.setDate(d.getDate() + 22);
  events.push({
    id: 200,
    kind: "kumite",
    title: "The Cougars Kumite",
    startsAt: `${kumite.toISOString().slice(0, 10)}T11:00:00Z`,
    endsAt: `${kumite.toISOString().slice(0, 10)}T16:00:00Z`,
    venue: "The rink",
    signup: true,
    capacity: 24,
    going: PLAYERS.slice(0, 12).map((p) => p.id),
    waitlist: [],
  });
  const social = new Date(d);
  social.setDate(d.getDate() + 15);
  events.push({
    id: 300,
    kind: "social",
    title: "End-of-season drinks",
    startsAt: `${social.toISOString().slice(0, 10)}T19:00:00Z`,
    endsAt: `${social.toISOString().slice(0, 10)}T22:00:00Z`,
    venue: "The pub",
    signup: false,
    going: [],
    waitlist: [],
  });
  return events.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export const EVENTS: ClubEvent[] = upcoming();

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
