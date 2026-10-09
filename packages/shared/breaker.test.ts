import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BreakerOpen,
  HttpFailure,
  QuotaError,
  guard,
  nextMidnight,
  pausedUntil,
  resetBreakers,
  retryAfter,
} from "./breaker";

let t = 0;
const now = () => t;
const down = () => Promise.reject(new Error("timeout"));
const up = () => Promise.resolve("ok");

describe("guard", () => {
  beforeEach(() => {
    resetBreakers();
    t = 1_000_000;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("stops calling a service after three failures in a row, then tries again after 30 seconds", async () => {
    const call = vi.fn(down);
    for (let i = 0; i < 3; i++) await expect(guard("s", call, { now, edge: null })).rejects.toThrow("timeout");
    await expect(guard("s", call, { now, edge: null })).rejects.toBeInstanceOf(BreakerOpen);
    expect(call).toHaveBeenCalledTimes(3);

    t += 30_000;
    await expect(guard("s", up, { now, edge: null })).resolves.toBe("ok");
    expect(await pausedUntil("s", { now, edge: null })).toBeNull();
  });

  it("waits twice as long each time the trial call fails too", async () => {
    for (let i = 0; i < 3; i++) await guard("s", down, { now, edge: null }).catch(() => {});
    t += 30_000;
    await guard("s", down, { now, edge: null }).catch(() => {}); // the trial fails: paused again at once
    expect(await pausedUntil("s", { now, edge: null })).toBe(t + 60_000);
  });

  it("pauses until a spent quota resets", async () => {
    const reset = t + 8 * 3600_000;
    await expect(
      guard("s", () => Promise.reject(new QuotaError("quota", reset)), { now, edge: null }),
    ).rejects.toThrow();
    expect(await pausedUntil("s", { now, edge: null })).toBe(reset);
  });

  it("doesn't count our own mistakes (a 400 or 404) against the service", async () => {
    for (let i = 0; i < 5; i++)
      await guard("s", () => Promise.reject(new HttpFailure("bad query", 400)), { now, edge: null }).catch(() => {});
    expect(await pausedUntil("s", { now, edge: null })).toBeNull();
  });

  it("shares an open breaker with other isolates through the edge cache", async () => {
    const store = new Map<string, Response>();
    const edge = {
      match: async (k: RequestInfo | URL) => store.get(String(k))?.clone(),
      put: async (k: RequestInfo | URL, r: Response) => void store.set(String(k), r),
      delete: async (k: RequestInfo | URL) => store.delete(String(k)),
    } as unknown as Cache;
    await guard("s", () => Promise.reject(new QuotaError("quota", t + 60_000)), { now, edge }).catch(() => {});
    resetBreakers(); // another isolate: empty memory
    const call = vi.fn(up);
    await expect(guard("s", call, { now, edge })).rejects.toBeInstanceOf(BreakerOpen);
    expect(call).not.toHaveBeenCalled();
  });
});

describe("retryAfter", () => {
  it("reads seconds, or falls back", () => {
    expect(retryAfter(new Response(null, { headers: { "retry-after": "120" } }), 5000, 0)).toBe(120_000);
    expect(retryAfter(new Response(null), 5000, 0)).toBe(5000);
  });
});

describe("nextMidnight", () => {
  it("is the next midnight in that time zone", () => {
    // 7 October 2026, 16:30 in London is 08:30 in Los Angeles (PDT, UTC-7): midnight there is 07:00 UTC on the 8th
    expect(new Date(nextMidnight("America/Los_Angeles", Date.parse("2026-10-07T15:30:00Z"))).toISOString()).toBe(
      "2026-10-08T07:00:00.000Z",
    );
  });
});
