// The club's free Cloudflare allowance (ADR 0059): admins see today's use on the Usage page, and an hourly check
// emails them once a day when anything passes 80%, or when a request was stopped for using too much CPU (ADR 0059).
// The live hub's requests and time (ADR 0072) are Durable Objects' own allowance, shown and checked the same way.
// Cloudflare's analytics API is faked; everything else is real.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mail } from "@cougars/shared/email";
import { NOW, testWorld } from "./testing";
import { checkUsage } from "./usage";

const ROSTER = [
  { name: "Dana Admin", position: "D", rating: 75, email: "dana@example.com", roles: ["Admin"] },
  { name: "Reg Player", position: "F", rating: 60, email: "reg@example.com" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
let w: ReturnType<typeof testWorld>;
let asked: { url: string; auth: string | null; body: Json }[];

/** Cloudflare's analytics, answering with today's totals. CPU time is in microseconds, as Cloudflare gives it. */
function cloudflare({
  requests = [30_000, 10_000],
  rowsRead = 1_000_000,
  rowsWritten = 2_000,
  cpu = [
    { p50: 1_200, p99: 4_800 },
    { p50: 800, p99: 2_100 },
  ],
  stopped = [] as number[],
  liveRequests = 300,
  // Two hours' draft night, in microseconds as Cloudflare gives it
  liveActiveUs = 7_200_000_000,
  ok = true,
} = {}) {
  asked = [];
  vi.stubGlobal("fetch", async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    asked.push({ url, auth: new Headers(init?.headers).get("authorization"), body: JSON.parse(String(init?.body)) });
    if (!ok) return new Response("nope", { status: 503 });
    return Response.json({
      data: {
        viewer: {
          accounts: [
            {
              workersInvocationsAdaptive: requests.map((r, i) => ({
                sum: { requests: r },
                quantiles: { cpuTimeP50: cpu[i]?.p50 ?? 0, cpuTimeP99: cpu[i]?.p99 ?? 0 },
                dimensions: { scriptName: `w${i}` },
              })),
              stopped: stopped.map((r, i) => ({ sum: { requests: r }, dimensions: { scriptName: `w${i}` } })),
              d1AnalyticsAdaptiveGroups: [{ sum: { rowsRead, rowsWritten } }],
              durableObjectsInvocationsAdaptiveGroups: [{ sum: { requests: liveRequests } }],
              durableObjectsPeriodicGroups: [{ sum: { activeTime: liveActiveUs } }],
            },
          ],
        },
      },
    });
  });
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  w = testWorld(ROSTER);
  Object.assign(w.env, { CLOUDFLARE_ANALYTICS_TOKEN: "analytics-token", CLOUDFLARE_ACCOUNT_ID: "acct" });
});
afterEach(() => vi.unstubAllGlobals());

const usageAs = async (email: string) => (await w.signedIn(email)).call("GET", "/api/usage");

describe("an admin checks the club's free Cloudflare allowance", () => {
  it("sees today's Worker requests, database reads and writes, and the live hub's use against the free limits, and when they reset", async () => {
    cloudflare();
    const res = await usageAs("dana@example.com");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ configured: true, day: "2026-10-06", resetsAt: "2026-10-07T00:00:00.000Z" });
    expect(res.body.metrics).toEqual([
      { id: "requests", label: "Worker requests", used: 40_000, limit: 100_000 },
      { id: "rowsRead", label: "Database rows read", used: 1_000_000, limit: 5_000_000 },
      { id: "rowsWritten", label: "Database rows written", used: 2_000, limit: 100_000 },
      { id: "liveRequests", label: "Live hub requests", used: 300, limit: 100_000 },
      // Two hours active at 128 MB
      { id: "liveTime", label: "Live hub time (GB-s)", used: 922, limit: 13_000 },
    ]);
    // Read with the read-only analytics token, for this account and today (UTC)
    expect(asked[0].auth).toBe("Bearer analytics-token");
    expect(asked[0].body.variables).toEqual({ account: "acct", day: "2026-10-06" });
  });

  it("sees each Worker's typical and slowest CPU time per request against the free plan's 10 ms, and any stopped", async () => {
    cloudflare({ stopped: [3] });
    const res = await usageAs("dana@example.com");
    expect(res.body.cpu).toEqual({
      limitMs: 10,
      workers: [
        { name: "w0", p50Ms: 1.2, p99Ms: 4.8, stopped: 3 },
        { name: "w1", p50Ms: 0.8, p99Ms: 2.1, stopped: 0 },
      ],
    });
  });

  it("members don't see it", async () => {
    cloudflare();
    expect((await usageAs("reg@example.com")).status).toBe(403);
  });

  it("says how to set it up when there's no analytics token", async () => {
    delete (w.env as Json).CLOUDFLARE_ANALYTICS_TOKEN;
    const res = await usageAs("dana@example.com");
    expect(res.body).toMatchObject({ configured: false });
    expect(res.body.metrics).toEqual([]);
  });

  it("says Cloudflare can't be read right now, rather than failing", async () => {
    cloudflare({ ok: false });
    const res = await usageAs("dana@example.com");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ configured: true, unavailable: true, metrics: [] });
  });
});

describe("the hourly check", () => {
  const run = async (now = NOW) => {
    const sent: Mail[] = [];
    await checkUsage(w.env, now, { send: async (m) => void sent.push(m) });
    return sent;
  };

  it("emails the admins once a day when something passes 80% of its free limit", async () => {
    cloudflare({ requests: [85_000] });
    const first = await run();
    expect(first).toHaveLength(1);
    expect(first[0].to).toEqual(["dana@example.com"]);
    expect(first[0].subject).toBe("Cougars app: Worker requests at 85% of today's free allowance");
    // An hour later, still over: no second email
    expect(await run(new Date(NOW.getTime() + 3_600_000))).toEqual([]);
    // The next day, over again: a new one
    expect(await run(new Date("2026-10-07T11:00:00Z"))).toHaveLength(1);
  });

  it("emails the admins when the live hub's time passes 80% of its free day", async () => {
    // 23 hours active: 10,598 GB-s of 13,000
    cloudflare({ liveActiveUs: 23 * 3_600_000_000 });
    const sent = await run();
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toBe("Cougars app: Live hub time (GB-s) at 81% of today's free allowance");
  });

  it("stays quiet under 80%", async () => {
    cloudflare({ requests: [79_000], rowsRead: 3_000_000 });
    expect(await run()).toEqual([]);
  });

  it("emails the admins once a day when a request was stopped for using too much CPU", async () => {
    cloudflare({ stopped: [2, 1] });
    const first = await run();
    expect(first).toHaveLength(1);
    expect(first[0].subject).toBe("Cougars app: 3 requests stopped today for using too much CPU");
    expect(first[0].text).toContain("w0: 2");
    expect(await run(new Date(NOW.getTime() + 3_600_000))).toEqual([]);
  });

  it("does nothing without a token, or when Cloudflare can't be read", async () => {
    cloudflare({ ok: false });
    expect(await run()).toEqual([]);
    delete (w.env as Json).CLOUDFLARE_ANALYTICS_TOKEN;
    expect(await run()).toEqual([]);
  });
});
