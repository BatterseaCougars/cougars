import { describe, expect, it } from "vitest";
import { ACTIONS, can, type Action } from "./actions";

describe("can", () => {
  const member = new Set<Action>(["read:Event", "signup:Event"]);

  it("allows granted actions and denies the rest", () => {
    expect(can(member, "signup:Event")).toBe(true);
    expect(can(member, "create:Event")).toBe(false);
  });

  it("lets manage:all do anything", () => {
    expect(can(new Set<Action>(["manage:all"]), "manage:Role")).toBe(true);
  });

  it("allows anonymous and signed-in requirements", () => {
    expect(can(new Set(), "anonymous")).toBe(true);
    expect(can(new Set(), "authenticated")).toBe(true);
  });
});

it("names every action verb:Subject", () => {
  for (const action of Object.keys(ACTIONS)) expect(action).toMatch(/^[a-z]+:[A-Z][A-Za-z]*$|^manage:all$/);
});
