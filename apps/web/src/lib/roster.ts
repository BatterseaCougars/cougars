// The club's players on the website, from the team app's members (docs/adr/0043-roster-from-the-club.md). The build
// takes a snapshot (scripts/club-snapshot.mjs); a card asks /api/players/<id> for the latest when it's flipped.
// Only the Cougars. The website is public, so only what's here leaves the database: the name they chose (first name
// and initial unless they picked otherwise), position and bio.
import type { Player } from "./sanity/types";

export interface RosterRow {
  id: number;
  name: string;
  /** The name they chose for the website (on their profile); null: first name and initial. */
  web_name: string | null;
  position: string;
  bio: string;
  /** From the build's snapshot only (the live lookup for a card doesn't send them). */
  sessions?: number;
  season?: number;
  tournaments?: number;
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
  name: r.web_name?.trim() || publicName(r.name),
  position: POSITIONS[r.position] ?? null,
  quote: r.bio.trim() || null,
  ...(r.sessions != null && {
    stats: { sessions: r.sessions, season: r.season ?? 0, tournaments: r.tournaments ?? 0 },
  }),
});

/** The member id behind a roster player, or null for a Sanity or sample one. */
export const memberId = (p: Player) => Number(p._id.match(/^member-(\d+)$/)?.[1]) || null;
