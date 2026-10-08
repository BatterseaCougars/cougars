// A tournament's fixtures, results and playoffs (ADR 0061). Once it has two teams (a captains' draft's captains, or the
// teams that entered), an admin has the app make the fixtures: a round robin, every team playing every other once
// (lib/fixtures.ts), then the playoff games its settings ask for, by table position. They can be made again until a
// game has a result. When the last group game has its result, the playoffs get their teams from the table.
import { all, first, run } from "../../../shared/d1";
import { roundRobin, table } from "../src/lib/fixtures";
import { HttpError, int } from "./http";
import type { Playoff } from "./schedule";

export interface Game {
  id: number;
  tournamentId: number;
  stage: "group" | "playoff";
  round: number;
  position: number;
  name: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeSeed: number | null;
  awaySeed: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  status: "next" | "live" | "done";
}

export const listGames = (db: D1Database, tournamentId?: number) =>
  all<Game>(
    db,
    `SELECT id, tournament_id tournamentId, stage, round, position, name, home_team_id homeTeamId,
            away_team_id awayTeamId, home_seed homeSeed, away_seed awaySeed, home_goals homeGoals,
            away_goals awayGoals, status
     FROM tournament_games ${tournamentId ? "WHERE tournament_id = ?" : ""} ORDER BY tournament_id, position`,
    tournamentId ? [tournamentId] : [],
  );

interface TournamentRow {
  kind: string;
  draftState: string;
  playoffs: string;
  win: number;
  draw: number;
  loss: number;
}

async function tournamentOf(db: D1Database, id: number) {
  const t = await first<TournamentRow>(
    db,
    `SELECT kind, draft_state draftState, playoffs, points_win win, points_draw draw, points_loss loss
     FROM tournaments WHERE id = ?`,
    [id],
  );
  if (!t) throw new HttpError(404, "No such tournament.");
  return t;
}

const teamIdsOf = async (db: D1Database, id: number) =>
  (
    await all<{ id: number }>(
      db,
      "SELECT id FROM tournament_teams WHERE tournament_id = ? ORDER BY coalesce(pick, 1000), id",
      [id],
    )
  ).map((t) => t.id);

/** An admin has the app make the fixtures: the round robin, then the playoffs waiting on the table. */
export async function makeFixtures(db: D1Database, id: number) {
  const t = await tournamentOf(db, id);
  const teams = await teamIdsOf(db, id);
  if (teams.length < 2) throw new HttpError(409, "Fixtures need at least two teams.");
  if (await first(db, "SELECT 1 FROM tournament_games WHERE tournament_id = ? AND home_goals IS NOT NULL", [id]))
    throw new HttpError(409, "A game has a result: the fixtures are set.");
  const playoffs = JSON.parse(t.playoffs) as Playoff[];
  const short = playoffs.find((p) => Math.max(p.home, p.away) > teams.length);
  if (short) throw new HttpError(409, `${short.name} needs ${Math.max(short.home, short.away)} teams.`);

  const rounds = roundRobin(teams);
  const rows: (string | number | null)[][] = [];
  rounds.forEach((games, r) =>
    games.forEach(([home, away]) => rows.push([id, "group", r + 1, rows.length + 1, "", home, away, null, null])),
  );
  for (const p of playoffs)
    rows.push([id, "playoff", rounds.length + 1, rows.length + 1, p.name, null, null, p.home, p.away]);
  await run(db, "DELETE FROM tournament_games WHERE tournament_id = ?", [id]);
  for (const r of rows)
    await run(
      db,
      `INSERT INTO tournament_games (tournament_id, stage, round, position, name, home_team_id, away_team_id,
         home_seed, away_seed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      r,
    );
}

/** A game's final score. The last group result fills the playoffs from the table. */
export async function scoreGame(db: D1Database, tournamentId: number, gameId: number, o: Record<string, unknown>) {
  const homeGoals = int(o, "homeGoals", { max: 99 });
  const awayGoals = int(o, "awayGoals", { max: 99 });
  const t = await tournamentOf(db, tournamentId);
  const game = (await listGames(db, tournamentId)).find((g) => g.id === gameId);
  if (!game) throw new HttpError(404, "No such game.");
  if (game.homeTeamId === null || game.awayTeamId === null)
    throw new HttpError(409, "This game's teams aren't known yet.");
  await run(db, "UPDATE tournament_games SET home_goals = ?, away_goals = ?, status = 'done' WHERE id = ?", [
    homeGoals,
    awayGoals,
    gameId,
  ]);
  if (game.stage === "group") await fillPlayoffs(db, tournamentId, t);
}

async function fillPlayoffs(db: D1Database, tournamentId: number, t: TournamentRow) {
  const games = await listGames(db, tournamentId);
  const group = games.filter((g) => g.stage === "group");
  if (group.some((g) => g.status !== "done")) return;
  const rows = table(await teamIdsOf(db, tournamentId), group, { win: t.win, draw: t.draw, loss: t.loss });
  for (const g of games.filter((g) => g.stage === "playoff" && g.status !== "done"))
    await run(db, "UPDATE tournament_games SET home_team_id = ?, away_team_id = ? WHERE id = ?", [
      rows[g.homeSeed! - 1]?.teamId ?? null,
      rows[g.awaySeed! - 1]?.teamId ?? null,
      g.id,
    ]);
}
