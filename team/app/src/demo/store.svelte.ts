// The demo's in-memory "database": changes last until reload. D1 replaces it from T1.
import { EVENTS, FEES, MEMBERS, ROLES } from "./data";

export const db = $state({
  events: structuredClone(EVENTS),
  roles: structuredClone(ROLES),
  members: structuredClone(MEMBERS),
  fees: structuredClone(FEES),
  /** Teams published for the next Friday, by player id. */
  teams: null as null | { name: string; players: number[] }[],
});
