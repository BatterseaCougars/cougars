// A tournament's games (ADR 0061), shared by the Worker (making fixtures, filling the playoffs) and the app (the
// Games and Standings pages): a round robin by the circle method, and the table from the results so far.

/** Every team plays every other once, in rounds where nobody plays twice (the circle method). */
export function roundRobin(teamIds: number[]): [number, number][][] {
  const ids = teamIds.length % 2 ? [...teamIds, -1] : [...teamIds];
  const rounds: [number, number][][] = [];
  for (let r = 0; r < ids.length - 1; r++) {
    const round: [number, number][] = [];
    for (let i = 0; i < ids.length / 2; i++) {
      const a = ids[i];
      const b = ids[ids.length - 1 - i];
      if (a !== -1 && b !== -1) round.push([a, b]);
    }
    rounds.push(round);
    ids.splice(1, 0, ids.pop()!);
  }
  return rounds;
}

export interface Result {
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeGoals: number | null;
  awayGoals: number | null;
  /** A game being played has a score but no result yet: only a finished one counts (ADR 0071). */
  status?: string;
}

export interface TableRow {
  teamId: number;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

/** The table from the games with a result: points, then goal difference, then goals for. */
export function table(
  teamIds: number[],
  results: Result[],
  points: { win: number; draw: number; loss: number } = { win: 3, draw: 1, loss: 0 },
): TableRow[] {
  const rows = new Map(teamIds.map((teamId) => [teamId, { teamId, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const g of results) {
    if (g.homeGoals == null || g.awayGoals == null || g.homeTeamId == null || g.awayTeamId == null) continue;
    if (g.status !== undefined && g.status !== "done") continue;
    for (const [id, f, a] of [
      [g.homeTeamId, g.homeGoals, g.awayGoals],
      [g.awayTeamId, g.awayGoals, g.homeGoals],
    ] as const) {
      const r = rows.get(id);
      if (!r) continue;
      r.p++;
      r.gf += f;
      r.ga += a;
      if (f > a) [r.w, r.pts] = [r.w + 1, r.pts + points.win];
      else if (f === a) [r.d, r.pts] = [r.d + 1, r.pts + points.draw];
      else [r.l, r.pts] = [r.l + 1, r.pts + points.loss];
    }
  }
  return [...rows.values()].sort((x, y) => y.pts - x.pts || y.gf - y.ga - (x.gf - x.ga) || y.gf - x.gf);
}

/**
 * Who won the tournament, once it's decided: with playoffs, whoever wins the last one (the final); without, the top
 * of the table once every game's played. A drawn final crowns nobody until a result settles it.
 */
export function champion(
  teamIds: number[],
  games: (Result & { stage: "group" | "playoff"; position: number })[],
  points?: { win: number; draw: number; loss: number },
): number | null {
  const playoffs = games.filter((g) => g.stage === "playoff");
  if (playoffs.length) {
    const final = playoffs.reduce((a, b) => (b.position > a.position ? b : a));
    if (final.status !== "done" || final.homeGoals == null || final.awayGoals == null) return null;
    if (final.homeGoals === final.awayGoals) return null;
    return final.homeGoals > final.awayGoals ? final.homeTeamId : final.awayTeamId;
  }
  if (!games.length || games.some((g) => g.status !== "done")) return null;
  return table(teamIds, games, points)[0]?.teamId ?? null;
}

/** The changeover between games, in minutes. */
export const BREAK_MINUTES = 5;

/**
 * When a game kicks off: one pitch, games in order from the tournament's start, each its format's length plus the
 * break before the next (ADR 0061). "HH:MM", London time like the start; a day that runs past midnight wraps.
 */
export function kickOff(startTime: string, gameMinutes: number, position: number, breakMinutes = BREAK_MINUTES) {
  const [h, m] = startTime.split(":").map(Number);
  const at = (h * 60 + m + (position - 1) * (gameMinutes + breakMinutes)) % (24 * 60);
  return `${String(Math.floor(at / 60)).padStart(2, "0")}:${String(at % 60).padStart(2, "0")}`;
}

/**
 * Who keeps score (ADR 0071): each game goes to a team sitting it out, in the day's order, taking turns evenly: the
 * one that's scored fewest so far, then the one that's waited longest, then the first in the pick order. A game whose
 * teams aren't known yet (a playoff waiting on the table) gets none, nor does any game when there's no third team.
 */
export function scorekeepers(
  teamIds: number[],
  games: { id: number; homeTeamId: number | null; awayTeamId: number | null }[],
): Map<number, number> {
  const count = new Map(teamIds.map((t) => [t, 0]));
  const lastAt = new Map(teamIds.map((t) => [t, -1]));
  const out = new Map<number, number>();
  games.forEach((g, at) => {
    if (g.homeTeamId === null || g.awayTeamId === null) return;
    const free = teamIds.filter((t) => t !== g.homeTeamId && t !== g.awayTeamId);
    if (!free.length) return;
    const pick = free.reduce((best, t) =>
      count.get(t)! < count.get(best)! || (count.get(t) === count.get(best) && lastAt.get(t)! < lastAt.get(best)!)
        ? t
        : best,
    );
    out.set(g.id, pick);
    count.set(pick, count.get(pick)! + 1);
    lastAt.set(pick, at);
  });
  return out;
}
