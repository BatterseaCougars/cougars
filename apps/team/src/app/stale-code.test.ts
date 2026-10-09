import { describe, expect, it } from "vitest";
import { isStaleCode, recoverOnce } from "./stale-code";

const store = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe("an open app after its code changed (a deploy, or the dev server restarting)", () => {
  it("knows a part of the app that won't load from any other failure", () => {
    expect(isStaleCode(new TypeError("Failed to fetch dynamically imported module: https://x/assets/a.js"))).toBe(true);
    expect(isStaleCode(new TypeError("Importing a module script failed."))).toBe(true); // Safari
    expect(isStaleCode(new TypeError("error loading dynamically imported module"))).toBe(true); // Firefox
    expect(isStaleCode(new TypeError("Failed to fetch"))).toBe(false); // the API, not the app's code
    expect(isStaleCode("nope")).toBe(false);
  });

  it("reloads once to pick up the new code, and doesn't loop if that didn't help", () => {
    const s = store();
    let reloads = 0;
    const reload = () => reloads++;
    let now = 1_000_000;
    expect(recoverOnce(s, reload, () => now)).toBe(true);
    expect(reloads).toBe(1);
    // Straight after that reload it's still failing: stop, so the person sees what's wrong
    now += 5_000;
    expect(recoverOnce(s, reload, () => now)).toBe(false);
    expect(reloads).toBe(1);
    // The next deploy, much later, gets its own reload
    now += 10 * 60_000;
    expect(recoverOnce(s, reload, () => now)).toBe(true);
    expect(reloads).toBe(2);
  });
});
