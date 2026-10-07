// A captains' draft (ADR 0060, after 0052). An admin opens it on the night; the captains take turns, in snake order,
// picking from the members who said they're in (captains are in automatically and never picked); an admin closes it
// once everyone's picked, or leaving the rest out on purpose, and then the teams are locked. Someone running the draft
// (run:Draft) can pick for the captain on the clock, and undo the last pick.
import { all, first, run } from "../../../shared/d1";
import { onTheClock } from "../src/lib/draft";
import { syncTournament } from "../../../shared/agenda";
import { HttpError } from "./http";
import { can, type Action } from "../src/access/actions";

interface DraftTeam {
  id: number;
  captain: number | null;
}

async function tournamentOf(db: D1Database, tournamentId: number) {
  const t = await first<{ kind: string; state: string }>(
    db,
    "SELECT kind, draft_state state FROM tournaments WHERE id = ?",
    [tournamentId],
  );
  if (!t) throw new HttpError(404, "No such tournament.");
  if (t.kind !== "draft") throw new HttpError(409, "Teams enter this tournament; there's no draft.");
  return t;
}

const teamsOf = (db: D1Database, tournamentId: number) =>
  all<DraftTeam>(
    db,
    "SELECT id, captain_member_id captain FROM tournament_teams WHERE tournament_id = ? ORDER BY pick, id",
    [tournamentId],
  );

/** Picks made so far: whose turn it is follows from how many. */
const PICKS = `SELECT COUNT(*) FROM tournament_team_players p JOIN tournament_teams t ON t.id = p.team_id
               WHERE t.tournament_id = ? AND p.pick_number IS NOT NULL`;

/** Members who said they're in, aren't captains and haven't been picked: who's left. */
const POOL = `SELECT e.member_id FROM tournament_entries e
              WHERE e.tournament_id = ? AND e.signup = 'in'
                AND e.member_id NOT IN (SELECT captain_member_id FROM tournament_teams
                                        WHERE tournament_id = ? AND captain_member_id IS NOT NULL)
                AND e.member_id NOT IN (SELECT p.member_id FROM tournament_team_players p
                                        JOIN tournament_teams t ON t.id = p.team_id
                                        WHERE t.tournament_id = ? AND p.member_id IS NOT NULL)`;

/** An admin opens the draft: the captains can pick. */
export async function openDraft(db: D1Database, tournamentId: number) {
  const t = await tournamentOf(db, tournamentId);
  if (t.state === "closed") throw new HttpError(409, "This draft is closed.");
  if ((await teamsOf(db, tournamentId)).length < 2) throw new HttpError(409, "A draft needs at least two captains.");
  await run(db, "UPDATE tournaments SET draft_state = 'open' WHERE id = ?", [tournamentId]);
  await syncTournament(db, tournamentId);
}

/** An admin closes the draft: once everyone's picked, or leaving the rest out on purpose. Then it's locked. */
export async function closeDraft(db: D1Database, tournamentId: number, leaveOut: boolean) {
  const t = await tournamentOf(db, tournamentId);
  if (t.state !== "open") throw new HttpError(409, "The draft isn't open.");
  const left = await first<{ n: number }>(db, `SELECT COUNT(*) n FROM (${POOL})`, [
    tournamentId,
    tournamentId,
    tournamentId,
  ]);
  if (left?.n && !leaveOut)
    throw new HttpError(409, `${left.n} still to pick. Pick them, or close it leaving them out.`);
  await run(db, "UPDATE tournaments SET draft_state = 'closed' WHERE id = ?", [tournamentId]);
  // Its draft night leaves the agenda
  await syncTournament(db, tournamentId);
}

/** The captain on the clock (or someone running the draft) picks a member who said they're in. */
export async function pick(
  db: D1Database,
  tournamentId: number,
  memberId: number,
  by: { memberId: number; actions: Set<Action> },
) {
  const t = await tournamentOf(db, tournamentId);
  if (t.state !== "open")
    throw new HttpError(409, t.state === "closed" ? "The draft is closed." : "The draft isn't open yet.");
  const teams = await teamsOf(db, tournamentId);
  const made = (await first<{ n: number }>(db, `SELECT (${PICKS}) n`, [tournamentId]))?.n ?? 0;
  const team = teams[onTheClock(teams.length, made)];
  const running = can(by.actions, "run:Draft");
  if (!running && !teams.some((x) => x.captain === by.memberId)) throw new HttpError(403, "Only the captains pick.");
  if (!running && team.captain !== by.memberId) throw new HttpError(409, "It's not your pick.");
  // One statement, so two captains tapping at once can't both pick: it only goes in if they're still in the pool
  // and no other pick has landed since
  const res = await run(
    db,
    `INSERT INTO tournament_team_players (team_id, member_id, name, position, pick_number)
     SELECT ?, ?, '', (SELECT COUNT(*) FROM tournament_team_players WHERE team_id = ?),
            (SELECT coalesce(max(p.pick_number), 0) + 1 FROM tournament_team_players p
             JOIN tournament_teams t ON t.id = p.team_id WHERE t.tournament_id = ?)
     WHERE ? IN (${POOL}) AND (${PICKS}) = ?`,
    [team.id, memberId, team.id, tournamentId, memberId, tournamentId, tournamentId, tournamentId, tournamentId, made],
  );
  if (!res.meta.changes)
    throw new HttpError(409, "They can't be picked: not signed up, a captain, already picked, or someone just picked.");
}

/** Someone running the draft takes back the last pick. */
export async function undoPick(db: D1Database, tournamentId: number) {
  const t = await tournamentOf(db, tournamentId);
  if (t.state !== "open") throw new HttpError(409, "The draft isn't open.");
  const res = await run(
    db,
    `DELETE FROM tournament_team_players WHERE id = (
       SELECT p.id FROM tournament_team_players p JOIN tournament_teams t ON t.id = p.team_id
       WHERE t.tournament_id = ? AND p.pick_number IS NOT NULL ORDER BY p.pick_number DESC LIMIT 1)`,
    [tournamentId],
  );
  if (!res.meta.changes) throw new HttpError(409, "Nobody's been picked yet.");
}

/**
 * A member says they're out of a drafted tournament (entries.ts): while the draft is open, a pick comes off their
 * team; once it's closed, or for a captain, it goes through an admin.
 */
export async function leaveDraft(db: D1Database, tournamentId: number, memberId: number) {
  const t = await first<{ kind: string; state: string }>(
    db,
    "SELECT kind, draft_state state FROM tournaments WHERE id = ?",
    [tournamentId],
  );
  if (t?.kind !== "draft") return;
  const captain = await first(db, "SELECT 1 FROM tournament_teams WHERE tournament_id = ? AND captain_member_id = ?", [
    tournamentId,
    memberId,
  ]);
  if (captain) throw new HttpError(409, "You're a captain: ask an admin to take you off.");
  const picked = await first<{ id: number }>(
    db,
    `SELECT p.id FROM tournament_team_players p JOIN tournament_teams tt ON tt.id = p.team_id
     WHERE tt.tournament_id = ? AND p.member_id = ?`,
    [tournamentId, memberId],
  );
  if (!picked) return;
  if (t.state === "closed") throw new HttpError(409, "You're on a team now: ask an admin to take you off.");
  await run(db, "DELETE FROM tournament_team_players WHERE id = ?", [picked.id]);
}
