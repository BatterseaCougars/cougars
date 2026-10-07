// A captains' draft (ADR 0052): on draft day the captains take turns, in snake order, picking from the members who
// said they're in. Teams pick in their pick order (1, 2, … n, n, … 2, 1, 1, 2, …). The captain on the clock picks;
// someone running the draft (run:Draft) can pick for them from one screen, and undo the last pick.
import { all, first, run } from "../../../shared/d1";
import { londonToday } from "../src/lib/dates";
import { onTheClock } from "../src/lib/draft";
import { HttpError } from "./http";
import { can, type Action } from "../src/access/actions";

interface DraftTeam {
  id: number;
  captain: number | null;
}

async function draftOf(db: D1Database, tournamentId: number, today: string) {
  const t = await first<{ kind: string; draftOn: string | null }>(
    db,
    "SELECT kind, draft_on draftOn FROM tournaments WHERE id = ?",
    [tournamentId],
  );
  if (!t) throw new HttpError(404, "No such tournament.");
  if (t.kind !== "draft") throw new HttpError(409, "Teams enter this tournament; there's no draft.");
  if (!t.draftOn || today < t.draftOn) throw new HttpError(409, "The draft hasn't started yet.");
  const teams = await all<DraftTeam>(
    db,
    "SELECT id, captain_member_id captain FROM tournament_teams WHERE tournament_id = ? ORDER BY pick, id",
    [tournamentId],
  );
  if (!teams.length) throw new HttpError(409, "This draft has no captains yet.");
  const made = await first<{ n: number }>(
    db,
    `SELECT COUNT(*) n FROM tournament_team_players p JOIN tournament_teams t ON t.id = p.team_id
     WHERE t.tournament_id = ?`,
    [tournamentId],
  );
  return { teams, made: made?.n ?? 0 };
}

/** The captain on the clock (or someone running the draft) picks a member who said they're in. */
export async function pick(
  db: D1Database,
  tournamentId: number,
  memberId: number,
  by: { memberId: number; actions: Set<Action> },
  now: string,
) {
  const { teams, made } = await draftOf(db, tournamentId, londonToday(new Date(now)));
  const team = teams[onTheClock(teams.length, made)];
  const running = can(by.actions, "run:Draft");
  if (!running && !teams.some((t) => t.captain === by.memberId)) throw new HttpError(403, "Only the captains pick.");
  if (!running && team.captain !== by.memberId) throw new HttpError(409, "It's not your pick.");
  // One statement, so two captains tapping at once can't both pick: it only goes in if no other pick has since
  const res = await run(
    db,
    `INSERT INTO tournament_team_players (team_id, member_id, name, position)
     SELECT ?, ?, '', (SELECT COUNT(*) FROM tournament_team_players WHERE team_id = ?)
     WHERE EXISTS (SELECT 1 FROM tournament_entries WHERE tournament_id = ? AND member_id = ? AND signup = 'in')
       AND NOT EXISTS (SELECT 1 FROM tournament_team_players p JOIN tournament_teams t ON t.id = p.team_id
                       WHERE t.tournament_id = ? AND p.member_id = ?)
       AND (SELECT COUNT(*) FROM tournament_team_players p JOIN tournament_teams t ON t.id = p.team_id
            WHERE t.tournament_id = ?) = ?`,
    [team.id, memberId, team.id, tournamentId, memberId, tournamentId, memberId, tournamentId, made],
  );
  if (!res.meta.changes)
    throw new HttpError(409, "They can't be picked: not signed up, already picked, or someone just picked.");
}

/** Someone running the draft takes back the last pick. */
export async function undoPick(db: D1Database, tournamentId: number, now: string) {
  await draftOf(db, tournamentId, londonToday(new Date(now)));
  const res = await run(
    db,
    `DELETE FROM tournament_team_players WHERE id = (
       SELECT p.id FROM tournament_team_players p JOIN tournament_teams t ON t.id = p.team_id
       WHERE t.tournament_id = ? ORDER BY p.id DESC LIMIT 1)`,
    [tournamentId],
  );
  if (!res.meta.changes) throw new HttpError(409, "Nobody's been picked yet.");
}
