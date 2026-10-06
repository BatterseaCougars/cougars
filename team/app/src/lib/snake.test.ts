import { describe, expect, it } from "vitest";
import { PLAYERS } from "../demo/data";
import { snakeTeams, teamCount } from "./snake";

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
  it("puts every player on exactly one team, with a defender on each", () => {
    const teams = snakeTeams(PLAYERS.slice(0, 16), ["White", "Black", "Cougars"]);
    const ids = teams.flatMap((t) => t.players);
    expect(new Set(ids).size).toBe(16);
    for (const t of teams)
      expect(t.players.some((id) => PLAYERS.find((p) => p.id === id)!.position === "D")).toBe(true);
  });
});
