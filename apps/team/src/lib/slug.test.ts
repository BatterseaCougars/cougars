import { expect, it } from "vitest";
import { slugify } from "./slug";

it("makes short, unique URL names", () => {
  expect(slugify("Friday Training")).toBe("friday-training");
  expect(slugify("The Cougars Kumite")).toBe("cougars-kumite");
  expect(slugify("Summer Cup", ["summer-cup"])).toBe("summer-cup-2");
});
