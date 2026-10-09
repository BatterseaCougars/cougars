import { describe, expect, it } from "vitest";
import { seasonEnd, seasonLabel, seasonOf } from "./seasons";

describe("seasons", () => {
  it("puts December, January and February in one winter, named for the December", () => {
    expect(seasonOf("2027-12-04")).toEqual({ season: "winter", year: 2027 });
    expect(seasonOf("2028-02-10")).toEqual({ season: "winter", year: 2027 });
    expect(seasonEnd("winter", 2027)).toBe("2028-02-29");
    expect(seasonLabel("winter", "2028-02-29")).toBe("Winter 2027");
  });

  it("knows the other seasons by month, each ending on its last day", () => {
    expect(seasonOf("2027-03-01").season).toBe("spring");
    expect(seasonOf("2027-08-31")).toEqual({ season: "summer", year: 2027 });
    expect(seasonOf("2027-11-30").season).toBe("autumn");
    expect(seasonEnd("summer", 2027)).toBe("2027-08-31");
    expect(seasonOf(seasonEnd("autumn", 2027))).toEqual({ season: "autumn", year: 2027 });
  });
});
