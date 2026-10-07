// The API's security rules (ADR 0036), as someone would try to get round them: no session, a plain member poking
// at admin routes, a member manager reaching for Admin, another site's form, and a member reading bootstrap in
// devtools. Driven through the real handler in the fake world (testing.ts, ADR 0031).
import { beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./index";
import { ROUTES } from "./api";
import { testWorld } from "./testing";

const ROSTER = [
  { name: "Dana Admin", position: "D", rating: 75, email: "dana@example.com", roles: ["Admin"] },
  { name: "Reg Player", position: "F", rating: 60, email: "reg@example.com" },
  { name: "Pat Plain", position: "G", rating: 40, email: "pat@example.com" },
];
let w: ReturnType<typeof testWorld>;

beforeEach(() => {
  w = testWorld(ROSTER);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

/** A path each route answers, its numbers filled with 1. */
const sample = (path: RegExp) =>
  path.source
    .replace(/^\^|\$$/g, "")
    .replace(/\(\\d\+\)/g, "1")
    .replace(/\\\//g, "/");

describe("every change", () => {
  it("says which parts of the club it touches, so the app gets them back (ADR 0054)", () => {
    const silent = ROUTES.filter((r) => r.method !== "GET" && !r.changes?.length).map((r) => `${r.method} ${r.path}`);
    expect(silent).toEqual([]);
  });
});

describe("every route", () => {
  it("answers no one who isn't signed in", async () => {
    const stranger = w.browser();
    for (const r of ROUTES) {
      const res = await stranger.call(r.method, sample(r.path), r.method === "GET" ? undefined : {});
      expect(res.status, `${r.method} ${sample(r.path)}`).toBe(401);
    }
  });

  it("refuses a plain member every route their role doesn't allow", async () => {
    const reg = await w.signedIn("reg@example.com");
    const allowed = new Set<string>((await reg.call("GET", "/api/bootstrap")).body.actions);
    for (const r of ROUTES.filter((r) => r.action !== "authenticated" && !allowed.has(r.action))) {
      const res = await reg.call(r.method, sample(r.path), r.method === "GET" ? undefined : {});
      expect(res.status, `${r.method} ${sample(r.path)} needs ${r.action}`).toBe(403);
    }
  });
});

describe("what bootstrap tells a plain member", () => {
  it("leaves out people asking to join, people who've left, and how to reach anyone else", async () => {
    await w
      .browser()
      .call("POST", "/api/auth/request", { name: "Nosy Stranger", email: "nosy@example.com", position: "F" });
    const admin = await w.signedIn("dana@example.com");
    const all = (await admin.call("GET", "/api/bootstrap")).body.members;
    const pat = all.find((m: { name: string }) => m.name === "Pat Plain");
    await admin.call("PUT", `/api/members/${pat.id}`, { ...pat, status: "inactive", roles: ["Member"] });
    expect(all.find((m: { name: string }) => m.name === "Nosy Stranger").email).toBe("nosy@example.com");

    const reg = await w.signedIn("reg@example.com");
    const b = (await reg.call("GET", "/api/bootstrap")).body;
    const names = b.members.map((m: { name: string }) => m.name);
    expect(names).toEqual(["Dana Admin", "Reg Player"]);
    const me = b.members.find((m: { id: number }) => m.id === b.me);
    const dana = b.members.find((m: { name: string }) => m.name === "Dana Admin");
    expect(me).toMatchObject({ email: "reg@example.com", paymentReference: expect.stringMatching(/^COUGARS [A-Z]+/) });
    expect(dana).toMatchObject({ email: null, paymentReference: null, phone: null, rating: 0 });
  });
});

describe("you can't grant what you don't have", () => {
  /** Reg, given a role with these actions (plus Member's), signed in. */
  async function regWith(actions: string[]) {
    const admin = await w.signedIn("dana@example.com");
    const { id } = (await admin.call("POST", "/api/roles", { name: "Helper", description: "", actions })).body;
    const reg = (await admin.call("GET", "/api/bootstrap")).body.members.find(
      (m: { name: string }) => m.name === "Reg Player",
    );
    expect((await admin.call("PUT", `/api/members/${reg.id}`, { ...reg, roles: ["Helper", "Member"] })).status).toBe(
      200,
    );
    return { roleId: id as number, regId: reg.id as number, reg: await w.signedIn("reg@example.com") };
  }

  it("lets a member manager change plain members but never make an admin or touch one", async () => {
    const { reg, regId } = await regWith(["manage:Member", "read:Event"]);
    const members = (await reg.call("GET", "/api/bootstrap")).body.members;
    const me = members.find((m: { id: number }) => m.id === regId);
    const pat = members.find((m: { name: string }) => m.name === "Pat Plain");
    const dana = members.find((m: { name: string }) => m.name === "Dana Admin");

    expect((await reg.call("PUT", `/api/members/${pat.id}`, { ...pat, rating: 55 })).status).toBe(200);
    expect((await reg.call("PUT", `/api/members/${regId}`, { ...me, roles: ["Admin", "Member"] })).status).toBe(403);
    expect((await reg.call("PUT", `/api/members/${pat.id}`, { ...pat, roles: ["Admin"] })).status).toBe(403);
    expect((await reg.call("PUT", `/api/members/${dana.id}`, { ...dana, status: "inactive" })).status).toBe(403);
    // An admin's email signs them in: setting it would be a way to become them
    const takeOver = await reg.call("PUT", `/api/members/${dana.id}/contact`, { email: "reg2@example.com" });
    expect(takeOver.status).toBe(403);
  });

  it("lets a role manager make roles only as strong as they are", async () => {
    const { reg, roleId } = await regWith(["manage:Role", "read:Event"]);
    const role = (actions: string[]) => ({ name: "Helper", description: "", actions });
    expect((await reg.call("PUT", `/api/roles/${roleId}`, role(["manage:Role", "manage:all"]))).status).toBe(403);
    expect((await reg.call("POST", "/api/roles", { ...role(["manage:all"]), name: "Boss" })).status).toBe(403);
    expect((await reg.call("POST", "/api/roles", { ...role(["read:Event"]), name: "Readers" })).status).toBe(201);
  });
});

describe("requests from somewhere else", () => {
  it("refuses another site's request, and anything that isn't JSON", async () => {
    const reg = await w.signedIn("reg@example.com");
    const evil = await reg.call("POST", "/api/me", {}, { headers: { origin: "https://evil.example" } });
    expect(evil.status).toBe(403);
    const sibling = await w
      .browser()
      .call("POST", "/api/auth/start", { email: "reg@example.com" }, { headers: { origin: "https://www.team.test" } });
    expect(sibling.status).toBe(403);
    const form = await reg.call("PUT", "/api/me", { position: "D" }, { headers: { "content-type": "text/plain" } });
    expect(form.status).toBe(415);
    const ours = await reg.call(
      "PUT",
      "/api/me",
      { position: "D", phone: "", bio: "" },
      { headers: { origin: "https://team.test" } },
    );
    expect(ours.status).toBe(200);
  });

  it("is never framed, sniffed or told where it came from", async () => {
    const res = await worker.fetch(
      new Request("https://team.test/api/health"),
      { DB: w.db, ASSETS: { fetch: async () => new Response("<!doctype html>") } as unknown as Fetcher },
      { waitUntil: () => {} } as unknown as ExecutionContext,
    );
    expect(Object.fromEntries(res.headers)).toMatchObject({
      "x-frame-options": "DENY",
      "content-security-policy": "frame-ancestors 'none'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "same-origin",
    });
  });
});

describe("an everyday role (ADR 0037)", () => {
  const roleId = (b: { roles: { id: number; name: string }[] }, name: string) =>
    b.roles.find((r) => r.name === name)!.id;

  it("an admin opens the app as a plain member day to day, and can go back to their full role", async () => {
    const dana = await w.signedIn("dana@example.com");
    const b = (await dana.call("GET", "/api/bootstrap")).body;
    expect(b.everydayRole).toBeNull();
    const member = roleId(b, "Member");
    expect((await dana.call("PUT", "/api/me/everyday-role", { roleId: member })).status).toBe(200);
    expect((await dana.call("GET", "/api/bootstrap")).body.everydayRole).toBe(member);
    // Still an admin underneath: the server goes by their real role
    expect((await dana.call("GET", "/api/bootstrap")).body.actions).toContain("manage:all");
    await dana.call("PUT", "/api/me/everyday-role", { roleId: null });
    expect((await dana.call("GET", "/api/bootstrap")).body.everydayRole).toBeNull();
  });

  it("is never a way up: a plain member can't make Admin their everyday role", async () => {
    const reg = await w.signedIn("reg@example.com");
    const b = (await reg.call("GET", "/api/bootstrap")).body;
    const res = await reg.call("PUT", "/api/me/everyday-role", { roleId: roleId(b, "Admin") });
    expect(res.status).toBe(403);
    expect((await reg.call("GET", "/api/bootstrap")).body.everydayRole).toBeNull();
  });
});
