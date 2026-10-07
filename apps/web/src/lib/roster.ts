// The club's players on the website, from the team app's members (docs/adr/0043-roster-from-the-club.md). The build
// takes a snapshot (scripts/roster-snapshot.mjs); a card asks /api/players/<id> for the latest when it's flipped.
// The website is public, so only what's here leaves the database: a first name and initial, position and bio.
import type { Player } from "./sanity/types";

export interface RosterRow {
  id: number;
  name: string;
  position: string;
  bio: string;
  cougar: number;
}

const POSITIONS: Record<string, string> = { F: "Forward", D: "Defence", G: "Goalie" };

/** "Adrian Kowalski" → "Adrian K." A single name stays as it is. */
export function publicName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export const toPlayer = (r: RosterRow): Player => ({
  _id: `member-${r.id}`,
  name: publicName(r.name),
  position: POSITIONS[r.position] ?? null,
  quote: r.bio.trim() || null,
});

/** The member id behind a roster player, or null for a Sanity or sample one. */
export const memberId = (p: Player) => Number(p._id.match(/^member-(\d+)$/)?.[1]) || null;
