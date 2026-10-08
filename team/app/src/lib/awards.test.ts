import { describe, expect, it } from "vitest";
import { awardFromData } from "./awards";

// Two teams: Ants (1, captain 10, goalie 12) and Bees (2, captain 20, goalie 22)
const teams = [
  { id: 1, captainMemberId: 10, players: [{ memberId: 11 }, { memberId: 12 }] },
  { id: 2, captainMemberId: 20, players: [{ memberId: 21 }, { memberId: 22 }] },
];
const positions: Record<number, string> = { 10: "F", 11: "D", 12: "G", 20: "F", 21: "D", 22: "G" };
const goal = (teamId: number, scorerId: number | null, assistId: number | null = null) => ({
  teamId,
  scorerId,
  assistId,
  atMs: 0,
  id: 0,
});
const game = (homeGoals: number, awayGoals: number, goals: ReturnType<typeof goal>[]) => ({
  stage: "group" as const,
  position: 1,
  homeTeamId: 1,
  awayTeamId: 2,
  homeGoals,
  awayGoals,
  status: "done",
  goals,
});
const t = {
  id: 7,
  teams,
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  games: [game(3, 1, [goal(1, 10), goal(1, 10), goal(1, 11), goal(2, 21)])],
};
const ctx = { positionOf: (id: number) => positions[id] };

describe("awards from the data", () => {
  it("Champions: the champion team", () => {
    expect(awardFromData("Champions", t, ctx)).toMatchObject({ winners: [{ teamId: 1 }] });
  });

  it("Top scorer: most goals, and joint winners on a tie", () => {
    expect(awardFromData("Top scorer", t, ctx)).toMatchObject({ winners: [{ memberId: 10 }], why: "2 goals" });
    const tied = { ...t, games: [game(1, 1, [goal(1, 10), goal(2, 21)])] };
    expect(
      awardFromData("Top scorer", tied, ctx)
        ?.winners.map((w) => w.memberId)
        .sort(),
    ).toEqual([10, 21]);
  });

  it("Top scorer: level on goals, the most assists wins it", () => {
    const close = { ...t, games: [game(1, 1, [goal(1, 10), goal(2, 21, 22)]), game(1, 0, [goal(1, 11, 10)])] };
    // 10, 11 and 21 have a goal each; 10 also has an assist
    expect(awardFromData("Top scorer", close, ctx)).toMatchObject({
      winners: [{ memberId: 10 }],
      why: "1 goal, 1 assist",
    });
  });

  it("Best goalie: the goalie whose team let in fewest a game", () => {
    expect(awardFromData("Best goalie", t, ctx)).toMatchObject({ winners: [{ memberId: 12 }] });
  });

  it("The Dim Mak: a player drawn at random, the same draw for the same seed", () => {
    const a = awardFromData("The Dim Mak", t, { ...ctx, seed: 1 });
    expect(a?.random).toBe(true);
    expect([10, 11, 12, 20, 21, 22]).toContain(a?.winners[0].memberId);
    expect(awardFromData("The Dim Mak", t, { ...ctx, seed: 1 })).toEqual(a);
  });

  it("an award the data can't decide: nothing, an admin picks", () => {
    expect(awardFromData("Best hair", t, ctx)).toBeNull();
  });

  it("nothing played, nothing decided", () => {
    expect(awardFromData("Top scorer", { ...t, games: [] }, ctx)).toBeNull();
  });
});
