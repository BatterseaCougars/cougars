// The app's own brake (ADR 0058): a tab that's gone wrong can't spend the club's free Cloudflare allowance.
import { describe, expect, it } from "vitest";
import { Brake } from "./brake";

const T0 = Date.parse("2026-10-07T12:00:00Z");
function clock() {
  let t = T0;
  return { now: () => t, wait: (ms: number) => (t += ms) };
}

describe("background checks for others' changes", () => {
  it("go ahead while the server's answering", () => {
    const c = clock();
    const brake = new Brake({ now: c.now });
    brake.answered(200, true);
    expect(brake.mayCheck()).toBe(true);
  });

  it("wait longer after each failure, up to five minutes, and a success puts them back", () => {
    const c = clock();
    const brake = new Brake({ now: c.now });
    const waits: number[] = [];
    for (let i = 0; i < 7; i++) {
      brake.answered(500, true);
      let waited = 0;
      while (!brake.mayCheck()) {
        c.wait(1000);
        waited += 1000;
      }
      waits.push(waited / 1000);
    }
    expect(waits).toEqual([10, 20, 40, 80, 160, 300, 300]);
    brake.answered(200, true);
    expect(brake.mayCheck()).toBe(true);
    brake.answered(500, true);
    c.wait(10_000);
    expect(brake.mayCheck()).toBe(true); // back to the first wait
  });

  it("treat the network being down as a failure", () => {
    const c = clock();
    const brake = new Brake({ now: c.now });
    brake.failed();
    expect(brake.mayCheck()).toBe(false);
    c.wait(10_000);
    expect(brake.mayCheck()).toBe(true);
  });

  it("don't count a refusal that's about the request (a 409, a 403)", () => {
    const brake = new Brake({ now: clock().now });
    brake.answered(409, true);
    brake.answered(403, true);
    expect(brake.mayCheck()).toBe(true);
  });
});

describe("a tab that's gone wrong", () => {
  it("stops calling the server after its day's allowance, and starts again the next day (UTC)", () => {
    const c = clock();
    const brake = new Brake({ now: c.now, perDay: 5 });
    for (let i = 0; i < 5; i++) expect(brake.take()).toBeNull();
    expect(brake.take()).toMatch(/paused itself/);
    expect(brake.mayCheck()).toBe(false);
    c.wait(12 * 60 * 60_000); // past midnight UTC
    expect(brake.take()).toBeNull();
  });
});

describe("when Cloudflare says the club's free allowance is used up for the day", () => {
  it("rests until midnight UTC, and says when it's back in London time", () => {
    const c = clock();
    const brake = new Brake({ now: c.now });
    // Cloudflare's error 1027: the Workers free plan's daily requests are used up
    brake.answered(429, false, true);
    expect(brake.mayCheck()).toBe(false);
    expect(brake.take()).toBe("The club's app has used today's free allowance. It's back at 01:00.");
    c.wait(12 * 60 * 60_000 - 1);
    expect(brake.take()).not.toBeNull();
    c.wait(1);
    expect(brake.take()).toBeNull();
    expect(brake.mayCheck()).toBe(true);
  });

  it("another 429 that isn't ours (a challenge, a platform blip) only slows the background checks", () => {
    const c = clock();
    const brake = new Brake({ now: c.now });
    brake.answered(429, false);
    expect(brake.take()).toBeNull();
    expect(brake.mayCheck()).toBe(false);
    c.wait(60_000);
    expect(brake.mayCheck()).toBe(true);
  });

  it("our own per-minute limit (a 429 that says why) only slows the background checks", () => {
    const c = clock();
    const brake = new Brake({ now: c.now });
    brake.answered(429, true);
    expect(brake.take()).toBeNull();
    expect(brake.mayCheck()).toBe(false);
    c.wait(60_000);
    expect(brake.mayCheck()).toBe(true);
  });
});
