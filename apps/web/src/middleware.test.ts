import { describe, expect, it, vi } from "vitest";
import type { CacheLike } from "../../../shared/rate-limit";

vi.mock("astro:middleware", () => ({ defineMiddleware: (fn: unknown) => fn }));
const { LIVE_LIMIT, tooMany } = await import("./middleware");

function memoryCache(): CacheLike {
  const store = new Map<string, string>();
  return {
    match: async (key) => (store.has(key) ? new Response(store.get(key)) : undefined),
    put: async (key, res) => void store.set(key, await res.text()),
  };
}

describe("live routes", () => {
  it("turn away an address that keeps asking, for a minute, and nobody else", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const cache = memoryCache();
    const now = Date.parse("2026-10-07T12:00:00Z");
    for (let i = 0; i < LIVE_LIMIT.limit; i++) expect(await tooMany(cache, "1.2.3.4", now)).toBeNull();
    const refused = await tooMany(cache, "1.2.3.4", now);
    expect(refused?.status).toBe(429);
    expect(refused?.headers.get("Retry-After")).toBe("60");
    expect(await tooMany(cache, "5.6.7.8", now)).toBeNull();
    expect(await tooMany(cache, "1.2.3.4", now + 60_000)).toBeNull();
  });
});
