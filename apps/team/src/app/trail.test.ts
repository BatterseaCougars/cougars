import { describe, expect, it } from "vitest";
import { walk, type Move } from "./trail";

const run = (moves: Move[]) => moves.reduce((s, m) => walk(s.trail, m), { trail: [] as string[], back: false });

describe("the trail of pages Back walks (#86)", () => {
  it("goes back the way you came: the board, a team, a matchup", () => {
    const deep = run([
      { kind: "open", from: "/tournaments/kumite/standings" },
      { kind: "open", from: "/tournaments/kumite/teams/3" },
    ]);
    expect(deep.trail).toEqual(["/tournaments/kumite/standings", "/tournaments/kumite/teams/3"]);
    const one = walk(deep.trail, {
      kind: "pop",
      to: "/tournaments/kumite/teams/3",
      from: "/tournaments/kumite/games/9",
    });
    expect(one).toEqual({ trail: ["/tournaments/kumite/standings"], back: true });
    const two = walk(one.trail, {
      kind: "pop",
      to: "/tournaments/kumite/standings",
      from: "/tournaments/kumite/teams/3",
    });
    expect(two).toEqual({ trail: [], back: true });
  });

  it("takes the browser's forward as opening the page again", () => {
    const after = walk(["/a"], { kind: "pop", to: "/c", from: "/b" });
    expect(after).toEqual({ trail: ["/a", "/b"], back: false });
  });

  it("leaves the trail alone when a page is swapped in place", () => {
    expect(walk(["/a"], { kind: "replace" })).toEqual({ trail: ["/a"], back: false });
  });
});
