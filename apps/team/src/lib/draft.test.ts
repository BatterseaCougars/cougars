import { describe, expect, it } from "vitest";
import { onTheClock } from "./draft";

describe("onTheClock", () => {
  it("snakes: 1 2 3 3 2 1 1 2", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((n) => onTheClock(3, n))).toEqual([0, 1, 2, 2, 1, 0, 0, 1]);
  });
  it("a single team always picks", () => {
    expect([0, 1, 2].map((n) => onTheClock(1, n))).toEqual([0, 0, 0]);
  });
});
