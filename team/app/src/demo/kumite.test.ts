import { describe, expect, it } from "vitest";
import { roundRobin, standings, type Match } from "./kumite";

describe("roundRobin", () => {
  it("has every team play every other exactly once", () => {
    const pairs = roundRobin([1, 2, 3, 4, 5]).flat();
    expect(pairs).toHaveLength(10);
    const keys = new Set(pairs.map(([a, b]) => [a, b].sort().join("-")));
    expect(keys.size).toBe(10);
  });
});

describe("standings", () => {
  it("ranks by points, then goal difference", () => {
    const m = (home: number, away: number, h: number, a: number): Match => ({
      id: home * 10 + away,
      home,
      away,
      status: "done",
      goals: [...Array(h).fill({ team: home, scorer: 1 }), ...Array(a).fill({ team: away, scorer: 2 })],
    });
    const table = standings([m(1, 2, 3, 0), m(3, 4, 1, 0), m(1, 3, 1, 1)]);
    expect(table.map((r) => r.team.id).slice(0, 2)).toEqual([1, 3]);
    expect(table[0].pts).toBe(4);
  });
});
