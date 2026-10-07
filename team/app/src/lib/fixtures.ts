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
