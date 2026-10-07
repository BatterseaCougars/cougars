// One player's details, live from D1, for a card that's just been picked up (lib/roster.ts). Only active Cougars.
import { first } from "../../../../../shared/d1";
import { toPlayer, type RosterRow } from "../roster";

export async function livePlayer(db: D1Database, id: number) {
  const row = await first<RosterRow>(
    db,
    "SELECT id, name, web_name, position, bio FROM members WHERE id = ? AND status = 'active' AND cougar = 1",
    [id],
  );
  return row ? toPlayer(row) : null;
}
