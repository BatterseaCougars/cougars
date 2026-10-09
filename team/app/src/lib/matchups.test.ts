import { describe, expect, it } from "vitest";
import { meetings } from "./matchups";

// Two past Kumites and this one. Ann (1) and Bob (2) captain this game's teams.
const team = (id: number, captainMemberId: number, players: number[] = []) => ({
  id,
  captainMemberId,
  players: players.map((memberId) => ({ memberId })),
});
const game = (id: number, home: number, away: number, hg: number | null, ag: number | null, status = "done") => ({
  id,
  homeTeamId: home,
  awayTeamId: away,
  homeGoals: hg,
  awayGoals: ag,
  status,
  position: id,
});
const spring = {
  id: 1,
  heldOn: "2026-04-11",
  // Ann captains 10, Bob plays on 11: they met once, Ann's side won 3–1; 12 had neither
  teams: [team(10, 1), team(11, 3, [2]), team(12, 4)],
  games: [game(100, 10, 11, 3, 1), game(101, 11, 12, 2, 2), game(102, 10, 12, 0, 1)],
};
const summer = {
  id: 2,
  heldOn: "2026-07-11",
  // Bob captains 20, Ann plays on 21: Bob's side won 2–0, and one not played yet doesn't count
  teams: [team(20, 2), team(21, 5, [1])],
  games: [game(200, 21, 20, 0, 2), game(201, 20, 21, null, null, "next")],
};
const now = {
  id: 3,
  heldOn: "2026-10-30",
  teams: [team(30, 1), team(31, 2)],
  games: [game(300, 30, 31, null, null, "next")],
};

describe("when two captains' sides last met", () => {
  it("finds the games where one was on each side, newest first, with the score from the first captain's side", () => {
    expect(
      meetings([spring, summer, now], now, 1, 2).map((m) => [m.tournament.id, m.game.id, m.for, m.against]),
    ).toEqual([
      [2, 200, 0, 2],
      [1, 100, 3, 1],
    ]);
  });

  it("leaves out this tournament, games not played yet, and games they were on the same side of", () => {
    const together = {
      id: 4,
      heldOn: "2026-05-01",
      teams: [team(40, 1, [2]), team(41, 6)],
      games: [game(400, 40, 41, 5, 0)],
    };
    expect(meetings([together, now], now, 1, 2)).toEqual([]);
  });
});
