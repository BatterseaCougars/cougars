// One player's details, live from D1, for a card that's just been picked up (lib/roster.ts). Only active Cougars.
// Cached for a minute (ADR 0053), so flipping cards back and forth doesn't read D1 each time.
import { first } from "@cougars/shared/d1";
import { toPlayer, type RosterRow } from "../roster";
import { cached, type CacheDeps } from "./cache";

export const cachedPlayer = (db: D1Database, id: number, deps?: CacheDeps) =>
  cached(`d1:player:${id}`, { ttlMs: 60_000, staleMs: 60 * 60_000 }, () => livePlayer(db, id), deps);

export async function livePlayer(db: D1Database, id: number) {
  const row = await first<RosterRow>(
    db,
    "SELECT id, name, web_name, position, bio FROM members WHERE id = ? AND status = 'active' AND cougar = 1",
    [id],
  );
  return row ? toPlayer(row) : null;
}
