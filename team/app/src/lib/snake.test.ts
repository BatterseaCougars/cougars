import { describe, expect, it } from "vitest";
import { TEAM_NAMES, type Player } from "../demo/data";
import { slotIn, snakeTeams, teamCount } from "./snake";

// Twenty made-up players: every third a defender, ratings spread out
const PLAYERS: Player[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `Player ${i + 1}`,
  position: i % 3 === 0 ? "D" : "F",
  rating: 50 + ((i * 37) % 45),
  cougar: i % 4 === 0,
}));

describe("teamCount", () => {
  it("matches the archived solver's team sizes (3 to 7 a side)", () => {
    expect(teamCount(6)).toBe(2);
    expect(teamCount(14)).toBe(2);
    expect(teamCount(15)).toBe(3);
    expect(teamCount(21)).toBe(3);
    expect(teamCount(22)).toBe(4);
  });
});

describe("snakeTeams", () => {
  const players = PLAYERS.slice(0, 16);
  const teams = snakeTeams(players, TEAM_NAMES);
  const byId = (id: number) => PLAYERS.find((p) => p.id === id)!;

  it("puts every player on exactly one team, sizes within one of each other", () => {
    const ids = teams.flatMap((t) => t.players);
    expect(new Set(ids).size).toBe(16);
    const sizes = teams.map((t) => t.players.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
  });

  it("puts the Cougars together on a team called Cougars", () => {
    const cougars = players.filter((p) => p.cougar).map((p) => p.id);
    const team = teams.find((t) => t.name === "Cougars")!;
    expect(cougars.every((id) => team.players.includes(id))).toBe(true);
  });

  it("gives every team a defender", () => {
    for (const t of teams) expect(t.players.some((id) => byId(id).position === "D")).toBe(true);
  });
});

describe("slotIn", () => {
  const p = (id: number, rating: number, position: "D" | "F" = "F", cougar = false): Player => ({
    id,
    name: `P${id}`,
    position,
    rating,
    cougar,
  });
  const all = [p(1, 60, "F", true), p(2, 50), p(3, 20), p(4, 80, "F", true), p(5, 70), p(6, 30)];
  const by = (id: number) => all.find((x) => x.id === id)!;

  it("keeps the teams and adds late sign-ups to the weaker side, best first", () => {
    const teams = [
      { name: "Black", players: [2] },
      { name: "White", players: [3] },
    ];
    const out = slotIn(teams, [by(5), by(6)], by);
    expect(out[0].players.slice(0, 1)).toEqual([2]);
    expect(out[1].players).toEqual([3, 5]);
    expect(out[0].players).toEqual([2, 6]);
  });

  it("puts a Cougar on the Cougars", () => {
    const teams = [
      { name: "Cougars", players: [1] },
      { name: "White", players: [3] },
    ];
    expect(slotIn(teams, [by(4)], by)[0].players).toEqual([1, 4]);
  });

  it("evens out the numbers before the ratings", () => {
    const teams = [
      { name: "Black", players: [5, 2] },
      { name: "White", players: [4] },
    ];
    expect(slotIn(teams, [by(3)], by)[1].players).toEqual([4, 3]);
  });
});
