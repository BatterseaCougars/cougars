import { describe, expect, it } from "vitest";
import { shortName, goesBy, matchesName } from "./names";

const adrian = { name: "Adrian Kaczmarczyk", webName: null };
const wall = { name: "Sam Jones", webName: "The Wall" };

describe("the name a member goes by", () => {
  it("is the name they chose on their profile, everywhere in the app", () => {
    expect(goesBy(wall)).toBe("The Wall");
    expect(goesBy({ name: "Dana Smith", webName: "Dana S." })).toBe("Dana S.");
  });

  it("is their full name when they haven't chosen one", () => {
    expect(goesBy(adrian)).toBe("Adrian Kaczmarczyk");
    expect(goesBy({ name: "Ethan", webName: "  " })).toBe("Ethan");
  });

  it("uses a chosen name whole where the app says just a first name (the card, greetings), and otherwise their first name", () => {
    expect(shortName(wall)).toBe("The Wall");
    expect(shortName(adrian)).toBe("Adrian");
    expect(shortName({ name: "Dana Smith", webName: "Dana S." })).toBe("Dana S.");
  });

  it("finds them by either name when searching", () => {
    expect(matchesName(wall, "wall")).toBe(true);
    expect(matchesName(wall, "sam")).toBe(true);
    expect(matchesName(adrian, "kacz")).toBe(true);
    expect(matchesName(adrian, "wall")).toBe(false);
  });
});
