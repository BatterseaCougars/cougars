// Keeping the free tier's limits (ADR 0054, ADR 0056): reopening the app when nothing's changed costs one row read,
// and nobody, signed in or not, can hammer the API. Driven through the real handler in the fake world (testing.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuotaError, guard, resetBreakers } from "../../../shared/breaker";
import type { CacheLike } from "../../../shared/rate-limit";
import { LIMITS } from "./limits";
import { testWorld } from "./testing";

const ROSTER = [
  { name: "Dana Admin", position: "D", rating: 75, email: "dana@example.com", roles: ["Admin"] },
  { name: "Reg Player", position: "F", rating: 60, email: "reg@example.com" },
];
const PROFILE = { position: "D", phone: "", bio: "" };
let w: ReturnType<typeof testWorld>;

beforeEach(() => {
  w = testWorld(ROSTER);
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetBreakers();
});

describe("reopening the app", () => {
  it("gets 'nothing's changed' until someone changes something", async () => {
    const reg = await w.signedIn("reg@example.com");
    const first = await reg.call("GET", "/api/bootstrap");
    const tag = first.headers.get("etag")!;
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("private, no-cache");

    const again = await reg.call("GET", "/api/bootstrap", undefined, { headers: { "if-none-match": tag } });
    expect(again.status).toBe(304);

    // Someone else's change is news to Reg too
    const dana = await w.signedIn("dana@example.com");
    expect((await dana.call("PUT", "/api/me", PROFILE)).status).toBe(200);
    const after = await reg.call("GET", "/api/bootstrap", undefined, { headers: { "if-none-match": tag } });
    expect(after.status).toBe(200);
    expect(after.headers.get("etag")).not.toBe(tag);
  });

  it("is never told 'nothing's changed' with another member's tag, or the next day", async () => {
    const reg = await w.signedIn("reg@example.com");
    const dana = await w.signedIn("dana@example.com");
    const danas = (await dana.call("GET", "/api/bootstrap")).headers.get("etag")!;
    expect((await reg.call("GET", "/api/bootstrap", undefined, { headers: { "if-none-match": danas } })).status).toBe(
      200,
    );
    const regs = (await reg.call("GET", "/api/bootstrap")).headers.get("etag")!;
    const tomorrow = new Date("2026-10-07T11:00:00Z");
    const next = await reg.call("GET", "/api/bootstrap", undefined, {
      now: tomorrow,
      headers: { "if-none-match": regs },
    });
    expect(next.status).toBe(200);
  });

  it("doesn't count a refused change as a change", async () => {
    const reg = await w.signedIn("reg@example.com");
    const tag = (await reg.call("GET", "/api/bootstrap")).headers.get("etag")!;
    expect((await reg.call("PUT", "/api/roles/1", { name: "x" })).status).toBe(403);
    expect((await reg.call("GET", "/api/bootstrap", undefined, { headers: { "if-none-match": tag } })).status).toBe(
      304,
    );
  });
});

describe("rate limits", () => {
  /** The Workers Cache API, in memory, as the rate limiter uses it. */
  function stubCaches() {
    const store = new Map<string, string>();
    const cache: CacheLike = {
      match: async (key) => (store.has(key) ? new Response(store.get(key)) : undefined),
      put: async (key, res) => void store.set(key, await res.text()),
    };
    vi.stubGlobal("caches", { open: async () => cache });
    // One minute window throughout, wherever the clock happens to be
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-06T11:00:00Z"));
  }

  it("slow down a member making changes faster than anyone taps, and nobody else", async () => {
    const reg = await w.signedIn("reg@example.com");
    const dana = await w.signedIn("dana@example.com");
    stubCaches();
    for (let i = 0; i < LIMITS.writesPerMember.limit; i++)
      expect((await reg.call("PUT", "/api/me", PROFILE)).status).toBe(200);
    const refused = await reg.call("PUT", "/api/me", PROFILE);
    expect(refused.status).toBe(429);
    expect(refused.body.error).toMatch(/Wait a minute/);
    expect((await reg.call("GET", "/api/bootstrap")).status).toBe(200); // reading still works
    expect((await dana.call("PUT", "/api/me", PROFILE)).status).toBe(200);
  });

  it("turn away an address that keeps asking, signed in or not", async () => {
    stubCaches();
    const stranger = w.browser();
    for (let i = 0; i < LIMITS.perAddress.limit; i++) await stranger.call("GET", "/api/bootstrap");
    const refused = await stranger.call("GET", "/api/bootstrap");
    expect(refused.status).toBe(429);
  });
});

describe("signing in while Gmail is paused", () => {
  it("says email isn't working, before anyone waits for a code that can't come", async () => {
    Object.assign(w.env, {
      TEAM_ENV: "dev",
      GMAIL_CLIENT_ID: "id",
      GMAIL_CLIENT_SECRET: "s",
      GMAIL_REFRESH_TOKEN: "r",
    });
    await guard("gmail", () => Promise.reject(new QuotaError("429", Date.now() + 15 * 60_000))).catch(() => {});
    const r = await w.browser().call("POST", "/api/auth/start", { email: "nobody@example.com" });
    expect(r.status).toBe(503); // member or not: it gives nothing away
    expect(r.body.error).toMatch(/Email isn't sending/);
  });
});

describe("making a change", () => {
  it("sends back the parts of the club it touched, not the whole club", async () => {
    const reg = await w.signedIn("reg@example.com");
    const r = await reg.call("PUT", "/api/me", { ...PROFILE, bio: "Stops pucks." });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body.changed)).toEqual(["members"]);
    expect(r.body.changed.members.find((m: { email: string }) => m.email === "reg@example.com").bio).toBe(
      "Stops pucks.",
    );
  });

  it("keeps what the change itself answered", async () => {
    const dana = await w.signedIn("dana@example.com");
    const r = await dana.call("POST", "/api/quips", { kind: "in", text: "See you on court." });
    expect(r.status).toBe(201);
    expect(r.body.id).toEqual(expect.any(Number));
    expect(r.body.changed.quips.some((q: { text: string }) => q.text === "See you on court.")).toBe(true);
  });

  it("shows only what this member may see, as the bootstrap does", async () => {
    const reg = await w.signedIn("reg@example.com");
    const changed = (await reg.call("PUT", "/api/me", PROFILE)).body.changed;
    const boot = (await reg.call("GET", "/api/bootstrap")).body;
    expect(changed.members).toEqual(boot.members);
  });
});
