// One player's details, live from D1, for a card that's just been flipped (lib/roster.ts). Only active members.
import { first } from "../../../../../shared/d1";
import { toPlayer, type RosterRow } from "../roster";

export async function livePlayer(db: D1Database, id: number) {
  const row = await first<RosterRow>(
    db,
    "SELECT id, name, position, bio, cougar FROM members WHERE id = ? AND status = 'active'",
    [id],
  );
  return row ? toPlayer(row) : null;
}
