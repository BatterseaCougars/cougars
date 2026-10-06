// Stand-in for the team generator until the glpk.js solver port lands (T3). It keeps the old solver's rules
// (archive/team-manager/lib/solver_lp.py): 3 to 7 a side, the Cougar players together on one team called
// "Cougars", a defender on every team where there are enough, and ratings balanced. Greedy, not optimal.
import type { Player } from "../demo/data";

export function teamCount(n: number): number {
  for (let t = 2; t <= 10; t++) if (Math.floor(n / t) >= 3 && Math.ceil(n / t) <= 7) return t;
  return Math.max(2, Math.ceil(n / 7));
}

export interface Team {
  name: string;
  players: number[];
}

export function snakeTeams(players: Player[], names: string[]): Team[] {
  const n = teamCount(players.length);
  const cap = Math.ceil(players.length / n);
  const teams = Array.from({ length: n }, () => ({ players: [] as Player[], rating: 0 }));
  const add = (t: number, p: Player) => {
    teams[t].players.push(p);
    teams[t].rating += p.rating;
  };

  // 1. The Cougars go together on the first team, best first, up to a full team.
  const cougars = players.filter((p) => p.cougar).sort((a, b) => b.rating - a.rating);
  const placed = new Set<number>();
  for (const p of cougars.slice(0, cap)) {
    add(0, p);
    placed.add(p.id);
  }

  // 2. Defenders, then forwards, best first: each to the team with room, fewest of that position, then fewest
  //    players, then the lowest rating.
  for (const position of ["G", "D", "F"] as const) {
    const pool = players
      .filter((p) => p.position === position && !placed.has(p.id))
      .sort((a, b) => b.rating - a.rating);
    for (const p of pool) {
      const count = (t: number) => teams[t].players.filter((x) => x.position === position).length;
      const best = teams
        .map((_, t) => t)
        .filter((t) => teams[t].players.length < cap)
        .sort(
          (a, b) =>
            count(a) - count(b) ||
            teams[a].players.length - teams[b].players.length ||
            teams[a].rating - teams[b].rating,
        )[0];
      add(best, p);
    }
  }

  const hasCougars = cougars.length > 0;
  const colours = names.filter((x) => x !== "Cougars");
  return teams.map((t, i) => ({
    name: hasCougars && i === 0 ? "Cougars" : (colours[hasCougars ? i - 1 : i] ?? `Team ${i + 1}`),
    players: t.players.map((p) => p.id),
  }));
}
