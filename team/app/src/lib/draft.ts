// A captains' draft's turn order (ADR 0052), shared by the Draft page and the Worker: snake order, so the teams
// pick 1, 2, … n, then n, … 2, 1, and round again.

/** The index, in pick order, of the team on the clock after `made` picks among `teams` teams. */
export function onTheClock(teams: number, made: number): number {
  const round = Math.floor(made / teams);
  const slot = made % teams;
  return round % 2 ? teams - 1 - slot : slot;
}

/** Enough of a tournament to say where its draft stands. */
interface Drafting {
  teams: { captainMemberId: number | null; players: { memberId: number | null; pick?: number | null }[] }[];
  going: number[];
}

/**
 * Where a draft stands: the picks made (as the server counts them: a player an admin put on by hand isn't one), how
 * many are left to pick, and, for a team, how many picks until its turn (0: now; Infinity: the pool runs out first).
 */
export function draftTurn(t: Drafting, team = -1) {
  const picks = t.teams.reduce((n, x) => n + x.players.filter((p) => typeof p.pick === "number").length, 0);
  const onTeams = new Set(t.teams.flatMap((x) => [x.captainMemberId, ...x.players.map((p) => p.memberId)]));
  const left = t.going.filter((id) => !onTeams.has(id)).length;
  let until = Infinity;
  if (team >= 0)
    for (let k = 0; k < left; k++)
      if (onTheClock(t.teams.length, picks + k) === team) {
        until = k;
        break;
      }
  return { picks, left, until };
}
