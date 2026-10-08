import { describe, expect, it } from "vitest";
import { champion, kickOff, roundRobin, scorekeepers, table } from "./fixtures";

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

describe("scorekeepers", () => {
  const game = (id: number, home: number | null, away: number | null) => ({ id, homeTeamId: home, awayTeamId: away });

  it("gives each game to a team sitting it out, taking turns evenly", () => {
    const teams = [1, 2, 3, 4];
    const games = roundRobin(teams)
      .flat()
      .map(([h, a], i) => game(i + 1, h, a));
    const by = scorekeepers(teams, games);
    for (const g of games) expect([g.homeTeamId, g.awayTeamId]).not.toContain(by.get(g.id));
    const counts = teams.map((t) => [...by.values()].filter((x) => x === t).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("leaves a game whose teams aren't known yet (a playoff waiting on the table) without one", () => {
    const by = scorekeepers([1, 2, 3], [game(1, 1, 2), game(2, null, null)]);
    expect(by.get(1)).toBe(3);
    expect(by.has(2)).toBe(false);
  });

  it("has nobody to give it to with only two teams", () => {
    expect(scorekeepers([1, 2], [game(1, 1, 2)]).size).toBe(0);
  });
});

describe("champion", () => {
  const game = (
    stage: "group" | "playoff",
    position: number,
    homeTeamId: number | null,
    awayTeamId: number | null,
    homeGoals: number | null,
    awayGoals: number | null,
  ) => ({
    stage,
    position,
    homeTeamId,
    awayTeamId,
    homeGoals,
    awayGoals,
    status: homeGoals === null ? "next" : "done",
  });
  const teams = [1, 2, 3];

  it("with playoffs: whoever wins the last one, the final", () => {
    const games = [
      game("group", 1, 1, 2, 3, 0),
      game("group", 2, 2, 3, 1, 0),
      game("group", 3, 3, 1, 0, 2),
      game("playoff", 4, 1, 2, null, null),
    ];
    expect(champion(teams, games)).toBeNull();
    games[3] = game("playoff", 4, 1, 2, 1, 4);
    expect(champion(teams, games)).toBe(2);
  });

  it("a drawn final crowns nobody until it's settled", () => {
    expect(champion(teams, [game("group", 1, 1, 2, 1, 0), game("playoff", 2, 1, 2, 2, 2)])).toBeNull();
  });

  it("without playoffs: the top of the table, once every game's played", () => {
    const games = [game("group", 1, 1, 2, 3, 0), game("group", 2, 2, 3, 1, 0), game("group", 3, 3, 1, null, null)];
    expect(champion(teams, games)).toBeNull();
    games[2] = game("group", 3, 3, 1, 0, 2);
    expect(champion(teams, games)).toBe(1);
  });

  it("no games, no champion", () => {
    expect(champion(teams, [])).toBeNull();
  });
});
