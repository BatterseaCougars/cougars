// Tournament results on the website (ADR 0100): what the team app recorded, read live from D1. Only a tournament
// that's public and done (shared/results.ts), and only award winners an admin confirmed (ADR 0044). People go by the
// name they chose, else first name and initial (shared/names.ts): no full name leaves this module.
import { all, type Param } from "../../../../../shared/d1";
import { onTheWebsite, publicName, shortOnTheWebsite } from "../../../../../shared/names";
import { champion, isDone, table } from "../../../../../shared/results";
import { isSeason, seasonLabel, seasonOf } from "../../../../../shared/seasons";
import { cached, type CacheDeps, type CacheOptions } from "./cache";

export interface PublishedAward {
  name: string;
  about: string;
  /** Who won it, confirmed: a team's name or a player's. Empty until an admin confirms. */
  winners: string[];
}

/** One tournament, for the list and the champions board. */
export interface PublishedSummary {
  id: number;
  name: string;
  /** Its series ("The Cougars Kumite"), if it has one. */
  series: { slug: string; name: string } | null;
  heldOn: string;
  /** "Autumn 2026". */
  season: string;
  /** The champions' team name; null if the day didn't decide one. */
  champions: string | null;
  /** The champions' team id, when it has a crest (/api/crests/<id>). */
  championsCrest: number | null;
  awards: PublishedAward[];
}

export interface PublishedTeam {
  id: number;
  name: string;
  crest: boolean;
  /** Captain first, then the players in order. */
  players: string[];
}

export interface PublishedGame {
  id: number;
  stage: "group" | "playoff";
  /** A playoff's name ("Final"); "" for a group game. */
  name: string;
  position: number;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
}

export interface PublishedEdition extends PublishedSummary {
  teams: PublishedTeam[];
  table: {
    teamId: number;
    name: string;
    p: number;
    w: number;
    d: number;
    l: number;
    gf: number;
    ga: number;
    pts: number;
  }[];
  games: PublishedGame[];
  /** Everyone with a goal or an assist: most goals, then most assists. */
  scorers: { name: string; team: string; goals: number; assists: number }[];
}

/** Fresh for a minute, so a result shows soon after the last game; the last good copy for an hour if D1 fails. */
export const RESULTS_CACHE: CacheOptions = { ttlMs: 60_000, staleMs: 60 * 60_000 };

export const cachedEditions = (db: D1Database, deps?: CacheDeps) =>
  cached("d1:results", RESULTS_CACHE, () => publishedEditions(db), deps);

export const cachedEdition = (db: D1Database, id: number, deps?: CacheDeps) =>
  cached(`d1:results:${id}`, RESULTS_CACHE, () => publishedEdition(db, id), deps);

export const cachedCrest = (db: D1Database, teamId: number, deps?: CacheDeps) =>
  cached(`d1:crest:${teamId}`, RESULTS_CACHE, () => crestOf(db, teamId), deps);

/** Every published tournament, newest first. */
export async function publishedEditions(db: D1Database): Promise<PublishedSummary[]> {
  return (await load(db)).map(({ teams: _t, table: _x, games: _g, scorers: _s, ...summary }) => summary);
}

/** One published tournament in full; null if it isn't published (private, not done, or no such tournament). */
export async function publishedEdition(db: D1Database, id: number): Promise<PublishedEdition | null> {
  return (await load(db, id))[0] ?? null;
}

/** A team's crest (a data: URL), only for a published tournament's team that has one. */
export async function crestOf(db: D1Database, teamId: number): Promise<string | null> {
  const [team] = await all<{ tournamentId: number; logo: string | null }>(
    db,
    "SELECT tournament_id tournamentId, logo FROM tournament_teams WHERE id = ?",
    [teamId],
  );
  if (!team?.logo) return null;
  return (await load(db, team.tournamentId)).length ? team.logo : null;
}

interface TournamentRow {
  id: number;
  name: string;
  heldOn: string;
  status: string;
  season: string | null;
  awards: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  seriesSlug: string | null;
  seriesName: string | null;
}
interface TeamRow {
  id: number;
  tournamentId: number;
  name: string;
  crest: number;
  captainName: string | null;
  captainWebName: string | null;
  outsideCaptain: string;
}
interface PlayerRow {
  teamId: number;
  name: string | null;
  webName: string | null;
  outsideName: string;
}
interface GameRow {
  id: number;
  tournamentId: number;
  stage: "group" | "playoff";
  name: string;
  position: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
}
interface GoalRow {
  tournamentId: number;
  teamId: number;
  scorerName: string | null;
  scorerWebName: string | null;
  scorerId: number | null;
  assistName: string | null;
  assistWebName: string | null;
  assistId: number | null;
}
interface WinnerRow {
  tournamentId: number;
  award: string;
  teamId: number | null;
  memberName: string | null;
  memberWebName: string | null;
}

/** The public tournaments (all, or one), each worked out in full; only the done ones come back. */
async function load(db: D1Database, only?: number): Promise<PublishedEdition[]> {
  const where = only === undefined ? "" : " AND t.id = ?";
  const params: Param[] = only === undefined ? [] : [only];
  const tournaments = await all<TournamentRow>(
    db,
    `SELECT t.id, t.name, t.held_on heldOn, t.status, t.season, t.awards, t.points_win pointsWin,
            t.points_draw pointsDraw, t.points_loss pointsLoss, y.slug seriesSlug, y.name seriesName
     FROM tournaments t LEFT JOIN tournament_types y ON y.id = t.type_id
     WHERE t.public = 1${where}
     ORDER BY t.held_on DESC, t.id DESC`,
    params,
  );
  if (!tournaments.length) return [];
  const of = `(SELECT id FROM tournaments t WHERE t.public = 1${where})`;
  const [games, teams, players, goals, winners] = await Promise.all([
    all<GameRow>(
      db,
      `SELECT id, tournament_id tournamentId, stage, name, position, home_team_id homeTeamId, away_team_id awayTeamId,
              home_goals homeGoals, away_goals awayGoals, status
       FROM tournament_games WHERE tournament_id IN ${of} ORDER BY position`,
      params,
    ),
    all<TeamRow>(
      db,
      `SELECT x.id, x.tournament_id tournamentId, x.name, x.logo IS NOT NULL crest, m.name captainName,
              m.web_name captainWebName, x.captain_name outsideCaptain
       FROM tournament_teams x LEFT JOIN members m ON m.id = x.captain_member_id
       WHERE x.tournament_id IN ${of} ORDER BY COALESCE(x.pick, 0), x.id`,
      params,
    ),
    all<PlayerRow>(
      db,
      `SELECT p.team_id teamId, m.name, m.web_name webName, p.name outsideName
       FROM tournament_team_players p JOIN tournament_teams x ON x.id = p.team_id
       LEFT JOIN members m ON m.id = p.member_id
       WHERE x.tournament_id IN ${of} ORDER BY p.position, p.id`,
      params,
    ),
    all<GoalRow>(
      db,
      `SELECT g.tournament_id tournamentId, o.team_id teamId,
              s.name scorerName, s.web_name scorerWebName, s.id scorerId,
              a.name assistName, a.web_name assistWebName, a.id assistId
       FROM tournament_goals o JOIN tournament_games g ON g.id = o.game_id
       LEFT JOIN members s ON s.id = o.scorer_member_id LEFT JOIN members a ON a.id = o.assist_member_id
       WHERE g.tournament_id IN ${of} AND g.status = 'done'`,
      params,
    ),
    all<WinnerRow>(
      db,
      `SELECT w.tournament_id tournamentId, w.award, w.team_id teamId, m.name memberName, m.web_name memberWebName
       FROM tournament_award_winners w LEFT JOIN members m ON m.id = w.member_id
       WHERE w.tournament_id IN ${of} ORDER BY w.award, w.position`,
      params,
    ),
  ]);

  const editions: PublishedEdition[] = [];
  for (const t of tournaments) {
    const myGames = games.filter((g) => g.tournamentId === t.id);
    if (!isDone(t.status, myGames)) continue;
    const myTeams = teams.filter((x) => x.tournamentId === t.id);
    const teamName = teamNamer(myTeams);
    const nameOf = new Map(myTeams.map((x) => [x.id, teamName(x)]));
    const points = { win: t.pointsWin, draw: t.pointsDraw, loss: t.pointsLoss };
    const teamIds = myTeams.map((x) => x.id);

    // The champions: as confirmed, else worked out from the games
    const myWinners = winners.filter((w) => w.tournamentId === t.id);
    const confirmed = myWinners.find((w) => w.award === "Champions" && w.teamId)?.teamId ?? null;
    const championId = confirmed ?? champion(teamIds, myGames, points);
    const awards = (JSON.parse(t.awards) as { name: string; about?: string }[]).map((a) => ({
      name: a.name,
      about: a.about ?? "",
      winners: myWinners
        .filter((w) => w.award === a.name)
        .map((w) =>
          w.teamId ? (nameOf.get(w.teamId) ?? "") : w.memberName ? onTheWebsite(w.memberName, w.memberWebName) : "",
        )
        .filter(Boolean),
    }));

    editions.push({
      id: t.id,
      name: t.name,
      series: t.seriesSlug && t.seriesName ? { slug: t.seriesSlug, name: t.seriesName } : null,
      heldOn: t.heldOn,
      season: seasonLabel(isSeason(t.season) ? t.season : seasonOf(t.heldOn).season, t.heldOn),
      champions: championId ? (nameOf.get(championId) ?? null) : null,
      championsCrest: championId && myTeams.find((x) => x.id === championId)?.crest ? championId : null,
      awards,
      teams: myTeams.map((x) => ({
        id: x.id,
        name: nameOf.get(x.id)!,
        crest: Boolean(x.crest),
        players: [
          ...(x.captainName
            ? [onTheWebsite(x.captainName, x.captainWebName)]
            : x.outsideCaptain
              ? [publicName(x.outsideCaptain)]
              : []),
          ...players
            .filter((p) => p.teamId === x.id)
            .map((p) => (p.name ? onTheWebsite(p.name, p.webName) : publicName(p.outsideName)))
            .filter(Boolean),
        ],
      })),
      table: table(teamIds, myGames, points).map((r) => ({ ...r, name: nameOf.get(r.teamId)! })),
      games: myGames.flatMap((g) =>
        g.status === "done" && g.homeTeamId && g.awayTeamId && g.homeGoals != null && g.awayGoals != null
          ? [
              {
                id: g.id,
                stage: g.stage,
                name: g.name,
                position: g.position,
                home: nameOf.get(g.homeTeamId)!,
                away: nameOf.get(g.awayTeamId)!,
                homeGoals: g.homeGoals,
                awayGoals: g.awayGoals,
              },
            ]
          : [],
      ),
      scorers: scorersOf(
        goals.filter((o) => o.tournamentId === t.id),
        nameOf,
      ),
    });
  }
  return editions;
}

/** A team's name: its own, else "Team" and its captain's short name (first name and initial, if two would match). */
function teamNamer(teams: TeamRow[]) {
  const short = (x: TeamRow) =>
    x.captainName ? shortOnTheWebsite(x.captainName, x.captainWebName) : x.outsideCaptain.trim().split(/\s+/)[0];
  const full = (x: TeamRow) =>
    x.captainName ? onTheWebsite(x.captainName, x.captainWebName) : publicName(x.outsideCaptain);
  return (x: TeamRow) => {
    if (x.name) return x.name;
    if (!short(x)) return "Team";
    const twin = teams.some((y) => y.id !== x.id && !y.name && short(y) === short(x));
    return `Team ${twin ? full(x) : short(x)}`;
  };
}

function scorersOf(goals: GoalRow[], teamName: Map<number, string>) {
  const by = new Map<number, { name: string; team: string; goals: number; assists: number }>();
  const tally = (id: number | null, name: string | null, webName: string | null, teamId: number) => {
    if (!id || !name) return null;
    let s = by.get(id);
    if (!s)
      by.set(id, (s = { name: onTheWebsite(name, webName), team: teamName.get(teamId) ?? "", goals: 0, assists: 0 }));
    return s;
  };
  for (const o of goals) {
    const scorer = tally(o.scorerId, o.scorerName, o.scorerWebName, o.teamId);
    if (scorer) scorer.goals++;
    const assist = tally(o.assistId, o.assistName, o.assistWebName, o.teamId);
    if (assist) assist.assists++;
  }
  return [...by.values()].sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.name.localeCompare(b.name));
}
