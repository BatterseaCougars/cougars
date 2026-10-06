// Types for roster.mjs, for the TypeScript that imports it (the team app's API tests).
export interface RosterPlayer {
  name: string;
  position: "F" | "D" | "G";
  rating: number;
  email: string | null;
  roles: string[];
  /** On the club's official team (the Cougars). */
  cougar: boolean;
}
export function parseRoster(text: string): RosterPlayer[];
export function rosterSql(players: RosterPlayer[], now?: Date): string;
