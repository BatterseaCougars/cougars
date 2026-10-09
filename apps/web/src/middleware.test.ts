import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CacheLike } from "../../../shared/rate-limit";
import { parseHeadersFile } from "../../../shared/testing/headers-file";

vi.mock("astro:middleware", () => ({ defineMiddleware: (fn: unknown) => fn }));
const { LIVE_LIMIT, SITE_HEADERS, secured, tooMany } = await import("./middleware");

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

describe("security headers (ADR 0036)", () => {
  it("go on every live response, and public/_headers gives prerendered pages the same", () => {
    const live = secured(new Response("<!doctype html>", { headers: { "content-type": "text/html" } }));
    expect(Object.fromEntries(live.headers)).toMatchObject(SITE_HEADERS);
    const file = parseHeadersFile(readFileSync(new URL("../public/_headers", import.meta.url), "utf8"));
    expect(file).toEqual({ "/*": SITE_HEADERS });
  });
});
