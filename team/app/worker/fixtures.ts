// A tournament's fixtures, results and playoffs (ADR 0061). Once it has two teams (a captains' draft's captains, or the
// teams that entered), an admin has the app make the fixtures: a round robin, every team playing every other once
// (lib/fixtures.ts), then the playoff games its settings ask for, by table position. They can be made again until a
// game has a result. When the last group game has its result, the playoffs get their teams from the table.
import { all, first, run } from "../../../shared/d1";
import { roundRobin, scorekeepers, table } from "../src/lib/fixtures";
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
  /** The team suggested to keep score: one sitting it out (ADR 0061); null until its teams are known. */
  scoringTeamId: number | null;
  /** Who holds the scoresheet: whoever pressed Start scoring (null: nobody yet). Only they score it. */
  keeperId: number | null;
  /** The game clock: time left when it last stopped, and when it was started again (null: stopped). */
  clockLeftMs: number | null;
  clockStartedAt: string | null;
  /** Each goal as it went in, in order. */
  goals: Goal[];
}

export interface Goal {
  id: number;
  teamId: number;
  scorerId: number | null;
  assistId: number | null;
  /** When, in game time: null when nobody said (a result typed in). */
  atMs: number | null;
}

export async function listGames(db: D1Database, tournamentId?: number): Promise<Game[]> {
  const where = tournamentId ? "WHERE tournament_id = ?" : "";
  const args = tournamentId ? [tournamentId] : [];
  const [rows, goals, teams] = await Promise.all([
    all<Omit<Game, "scoringTeamId" | "goals">>(
      db,
      `SELECT id, tournament_id tournamentId, stage, round, position, name, home_team_id homeTeamId,
              away_team_id awayTeamId, home_seed homeSeed, away_seed awaySeed, home_goals homeGoals,
              away_goals awayGoals, status, clock_left_ms clockLeftMs, clock_started_at clockStartedAt,
              keeper_member_id keeperId
       FROM tournament_games ${where} ORDER BY tournament_id, position`,
      args,
    ),
    all<Goal & { gameId: number }>(
      db,
      `SELECT id, game_id gameId, team_id teamId, scorer_member_id scorerId, assist_member_id assistId, at_ms atMs
       FROM tournament_goals WHERE game_id IN (SELECT id FROM tournament_games ${where})
       ORDER BY at_ms IS NULL, at_ms, id`,
      args,
    ),
    all<{ id: number; tournamentId: number }>(
      db,
      `SELECT id, tournament_id tournamentId FROM tournament_teams ${where}
       ORDER BY tournament_id, coalesce(pick, 1000), id`,
      args,
    ),
  ]);
  // Who keeps score, per tournament, from its teams in pick order and its games in the day's order
  const keepers = new Map<number, number>();
  for (const tid of new Set(rows.map((g) => g.tournamentId)))
    for (const [game, team] of scorekeepers(
      teams.filter((t) => t.tournamentId === tid).map((t) => t.id),
      rows.filter((g) => g.tournamentId === tid),
    ))
      keepers.set(game, team);
  return rows.map((g) => ({
    ...g,
    scoringTeamId: keepers.get(g.id) ?? null,
    goals: goals.filter((x) => x.gameId === g.id).map(({ gameId: _, ...x }) => x),
  }));
}

export interface TournamentRow {
  kind: string;
  draftState: string;
  playoffs: string;
  win: number;
  draw: number;
  loss: number;
  gameMinutes: number;
}

export async function tournamentOf(db: D1Database, id: number) {
  const t = await first<TournamentRow>(
    db,
    `SELECT kind, draft_state draftState, playoffs, points_win win, points_draw draw, points_loss loss,
            game_minutes gameMinutes
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
  if (
    await first(
      db,
      "SELECT 1 FROM tournament_games WHERE tournament_id = ? AND (home_goals IS NOT NULL OR status <> 'next')",
      [id],
    )
  )
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
  await run(
    db,
    "DELETE FROM tournament_goals WHERE game_id IN (SELECT id FROM tournament_games WHERE tournament_id = ?)",
    [id],
  );
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

/**
 * A game's final score, typed in by an admin (the game up next, after the fact, or a correction). The score is always
 * its goals: missing ones go on as nobody-said-who with no time, extra ones come off (those first, then the latest).
 * The last group result fills the playoffs from the table.
 */
export async function scoreGame(db: D1Database, tournamentId: number, gameId: number, o: Record<string, unknown>) {
  const homeGoals = int(o, "homeGoals", { max: 99 });
  const awayGoals = int(o, "awayGoals", { max: 99 });
  const t = await tournamentOf(db, tournamentId);
  const game = (await listGames(db, tournamentId)).find((g) => g.id === gameId);
  if (!game) throw new HttpError(404, "No such game.");
  if (game.homeTeamId === null || game.awayTeamId === null)
    throw new HttpError(409, "This game's teams aren't known yet.");
  // A played game (put right), or the one up next: the first in the day's order that isn't over
  const upNext = (await listGames(db, tournamentId)).find((g) => g.status !== "done");
  if (game.status !== "done" && upNext?.id !== gameId)
    throw new HttpError(409, `Game ${upNext?.position ?? ""} is up next: score that one.`);
  if (game.stage === "playoff" && homeGoals === awayGoals)
    throw new HttpError(400, "A playoff can't end level: the next goal won it.");
  await run(db, "UPDATE tournament_games SET home_goals = ?, away_goals = ?, status = 'done' WHERE id = ?", [
    homeGoals,
    awayGoals,
    gameId,
  ]);
  await matchGoals(db, gameId, game.homeTeamId, homeGoals);
  await matchGoals(db, gameId, game.awayTeamId, awayGoals);
  if (game.stage === "group") await fillPlayoffs(db, tournamentId, t);
}

/** One side's goals made to match its score. */
export async function matchGoals(db: D1Database, gameId: number, teamId: number, score: number) {
  const have =
    (
      await first<{ n: number }>(db, "SELECT count(*) n FROM tournament_goals WHERE game_id = ? AND team_id = ?", [
        gameId,
        teamId,
      ])
    )?.n ?? 0;
  for (let i = have; i < score; i++)
    await run(db, "INSERT INTO tournament_goals (game_id, team_id, at_ms, created_at) VALUES (?, ?, NULL, ?)", [
      gameId,
      teamId,
      new Date().toISOString(),
    ]);
  if (have > score)
    await run(
      db,
      `DELETE FROM tournament_goals WHERE id IN (SELECT id FROM tournament_goals WHERE game_id = ? AND team_id = ?
         ORDER BY scorer_member_id IS NULL DESC, at_ms IS NULL DESC, at_ms DESC, id DESC LIMIT ?)`,
      [gameId, teamId, have - score],
    );
}

export async function fillPlayoffs(db: D1Database, tournamentId: number, t: TournamentRow) {
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
