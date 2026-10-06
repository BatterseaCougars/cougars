// Stand-in for the team generator until the glpk.js solver port lands (T3): the solver's own fallback, a snake
// draft by rating, done separately for defenders and forwards so each team gets both.
import type { Player } from "../demo/data";

export function teamCount(n: number): number {
  for (let t = 2; t <= 10; t++) if (Math.floor(n / t) >= 3 && Math.ceil(n / t) <= 7) return t;
  return Math.max(2, Math.ceil(n / 7));
}

export function snakeTeams(players: Player[], names: string[]): { name: string; players: number[] }[] {
  const n = teamCount(players.length);
  const teams = Array.from({ length: n }, (_, i) => ({ name: names[i] ?? `Team ${i + 1}`, players: [] as number[] }));
  let pick = 0;
  for (const position of ["D", "F"] as const) {
    const pool = players.filter((p) => p.position === position).sort((a, b) => b.rating - a.rating);
    for (const p of pool) {
      const round = Math.floor(pick / n);
      const slot = pick % n;
      teams[round % 2 ? n - 1 - slot : slot].players.push(p.id);
      pick++;
    }
  }
  return teams;
}
