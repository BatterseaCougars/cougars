import { describe, expect, it } from "vitest";
import type { Action } from "../access/actions";
import { stripRoutes, tabHref, tabRoutes } from "./mobile-nav";

const member = new Set<Action>(["read:Event", "signup:Event"]);
const admin = new Set<Action>(["manage:all"]);

describe("tabRoutes", () => {
  it("hides pages the member can't use", () => {
    expect(tabRoutes("friday", member).map((r) => r.id)).toEqual(["friday"]);
    expect(tabRoutes("friday", admin).map((r) => r.id)).toEqual(["friday", "register"]);
  });

  it("leaves full-screen pages out of the strip", () => {
    expect(tabRoutes("kumite", admin).map((r) => r.id)).not.toContain("game");
  });
});

describe("stripRoutes", () => {
  it("shows a strip only when a tab has more than one page", () => {
    expect(stripRoutes("friday", member)).toEqual([]);
    expect(stripRoutes("friday", admin).map((r) => r.id)).toEqual(["friday", "register"]);
  });
});

describe("tabHref", () => {
  it("returns to the last page used in the tab", () => {
    expect(tabHref("friday", admin, { friday: "/friday/register" })).toBe("/friday/register");
  });

  it("falls back to the first page when the remembered one is no longer allowed", () => {
    expect(tabHref("friday", member, { friday: "/friday/register" })).toBe("/friday");
  });
});
