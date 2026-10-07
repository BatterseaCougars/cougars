import { describe, expect, it } from "vitest";
import { roundRobin, table } from "./fixtures";

describe("roundRobin", () => {
  it("has every team play every other exactly once, nobody twice in a round", () => {
    const rounds = roundRobin([1, 2, 3, 4, 5]);
    const pairs = rounds.flat();
    expect(pairs).toHaveLength(10);
    expect(new Set(pairs.map(([a, b]) => [a, b].sort().join("-"))).size).toBe(10);
    for (const r of rounds) expect(new Set(r.flat()).size).toBe(r.flat().length);
  });
});

describe("table", () => {
  it("ranks by points, then goal difference, and leaves out games without a result", () => {
    const g = (homeTeamId: number, awayTeamId: number, homeGoals: number | null, awayGoals: number | null) => ({
      homeTeamId,
      awayTeamId,
      homeGoals,
      awayGoals,
    });
    const rows = table([1, 2, 3, 4], [g(1, 2, 3, 0), g(3, 4, 1, 0), g(1, 3, 1, 1), g(2, 4, null, null)]);
    expect(rows.map((r) => r.teamId).slice(0, 2)).toEqual([1, 3]);
    expect(rows[0]).toMatchObject({ p: 2, w: 1, d: 1, pts: 4 });
  });
});
