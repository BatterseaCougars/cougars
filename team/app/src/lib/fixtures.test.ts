import { describe, expect, it } from "vitest";
import { kickOff, roundRobin, table } from "./fixtures";

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

describe("kickOff", () => {
  it("spaces the games by their length plus a five-minute break, from the start", () => {
    expect(kickOff("11:00", 12, 1)).toBe("11:00");
    expect(kickOff("11:00", 12, 2)).toBe("11:17");
    expect(kickOff("11:00", 12, 7)).toBe("12:42");
    expect(kickOff("23:50", 10, 2)).toBe("00:05");
  });
});
