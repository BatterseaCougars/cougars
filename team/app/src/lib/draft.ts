// A captains' draft's turn order (ADR 0052), shared by the Draft page and the Worker: snake order, so the teams
// pick 1, 2, … n, then n, … 2, 1, and round again.

/** The index, in pick order, of the team on the clock after `made` picks among `teams` teams. */
export function onTheClock(teams: number, made: number): number {
  const round = Math.floor(made / teams);
  const slot = made % teams;
  return round % 2 ? teams - 1 - slot : slot;
}
