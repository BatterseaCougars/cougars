import { describe, expect, it } from "vitest";
import { PLAYERS, TEAM_NAMES } from "../demo/data";
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
