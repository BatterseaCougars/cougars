import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cached, clearCache } from "./cache";

// A clock the test moves by hand, and an in-memory stand-in for Cloudflare's edge cache.
function setup() {
  let t = 1_000_000;
  const store = new Map<string, Response>();
  const edge = {
    match: vi.fn(async (url: RequestInfo | URL) => store.get(String(url))?.clone()),
    put: vi.fn(async (url: RequestInfo | URL, res: Response) => void store.set(String(url), res)),
  };
  return { now: () => t, tick: (ms: number) => (t += ms), edge, store };
}

const opts = { ttlMs: 1000, staleMs: 5000 };

describe("cached", () => {
  beforeEach(() => {
    clearCache();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("loads once while fresh, then again once it expires", async () => {
    const { now, tick } = setup();
    const load = vi.fn(async () => "v");
    expect(await cached("k", opts, load, { now, edge: null })).toBe("v");
    tick(999);
    await cached("k", opts, load, { now, edge: null });
    expect(load).toHaveBeenCalledTimes(1);
    tick(2);
    await cached("k", opts, load, { now, edge: null });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one load between concurrent requests", async () => {
    const { now } = setup();
    let resolve!: (v: string) => void;
    const load = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    const both = Promise.all([
      cached("k", opts, load, { now, edge: null }),
      cached("k", opts, load, { now, edge: null }),
    ]);
    await Promise.resolve();
    resolve("v");
    expect(await both).toEqual(["v", "v"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("serves the last good value when the source fails, until it's too old", async () => {
    const { now, tick } = setup();
    await cached("k", opts, async () => "good", { now, edge: null });
    const failing = async () => {
      throw new Error("quota");
    };
    tick(2000); // expired, within the stale window
    expect(await cached("k", opts, failing, { now, edge: null })).toBe("good");
    tick(5000); // past ttl + stale
    await expect(cached("k", opts, failing, { now, edge: null })).rejects.toThrow("quota");
  });

  it("throws when the source fails and nothing was ever cached", async () => {
    const { now } = setup();
    await expect(cached("k", opts, async () => Promise.reject(new Error("down")), { now, edge: null })).rejects.toThrow(
      "down",
    );
  });

  it("shares values through the edge cache between isolates", async () => {
    const { now, edge } = setup();
    const load = vi.fn(async () => ({ n: 1 }));
    await cached("k", opts, load, { now, edge });
    expect(edge.put).toHaveBeenCalledTimes(1);
    clearCache(); // a different isolate: empty memory, same edge cache
    expect(await cached("k", opts, load, { now, edge })).toEqual({ n: 1 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps working when the edge cache throws", async () => {
    const { now } = setup();
    const broken = {
      match: async () => Promise.reject(new Error("no")),
      put: async () => Promise.reject(new Error("no")),
    };
    expect(await cached("k", opts, async () => "v", { now, edge: broken })).toBe("v");
  });
});
