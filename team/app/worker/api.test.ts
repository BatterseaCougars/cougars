// The team app's API, as the club uses it: the admin opens the app on the real roster and schedule, cancels the
// odd Friday, edits members and the training. Driven through the real handler on an in-memory D1 with every
// migration and the roster seed applied (ADR 0031).
import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "../../../shared/testing/d1-sqlite";
import { parseRoster, rosterSql } from "../../../scripts/lib/roster.mjs";
import { ACTIONS } from "../src/access/actions";
import { ROUTES, handleApi, type Env } from "./api";

const ROSTER = [
  { name: "Dana Admin", position: "D", rating: 75, email: "dana@example.com", roles: ["Admin"] },
  { name: "Alt Uploader", position: "F", rating: 45, roles: ["Contributor"] },
  { name: "Reg Player", position: "F", rating: 60 },
];

// Tuesday 6 October 2026, midday in London
const NOW = new Date("2026-10-06T11:00:00Z");
let env: Env;

beforeEach(() => {
  const db = createTestD1();
  db.raw.exec(rosterSql(parseRoster(JSON.stringify(ROSTER)), NOW));
  env = { DB: db, TEAM_ENV: "local" };
});

async function call(method: string, path: string, payload?: unknown, e: Env = env) {
  const res = await handleApi(
    new Request(`http://team.test${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
    e,
    NOW,
  );
  // The tests read whatever the API sent back; its shapes are checked by the assertions themselves.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
const boot = async () => (await call("GET", "/api/bootstrap")).body;

describe("opening the app", () => {
  it("shows every Friday for the next 12 weeks at Battersea Sports Centre, 21 skaters and 3 goalies", async () => {
    const b = await boot();
    expect(b.series).toEqual([
      expect.objectContaining({
        name: "Friday Training",
        weekdays: ["fri"],
        startTime: "19:30",
        endTime: "21:30",
        venue: "Battersea Sports Centre",
        capacity: 21,
        goalieCapacity: 3,
      }),
    ]);
    const dates = b.sessions.map((s: { heldOn: string }) => s.heldOn);
    expect(dates[0]).toBe("2026-10-09");
    expect(dates).toHaveLength(12);
    expect(dates.every((d: string) => new Date(`${d}T12:00:00Z`).getUTCDay() === 5)).toBe(true);
  });

  it("has the Kumite with no dates yet", async () => {
    const b = await boot();
    expect(b.tournamentTypes.map((t: { name: string }) => t.name)).toEqual(["The Cougars Kumite"]);
    expect(b.tournaments).toEqual([]);
  });

  it("knows the roster and who does what: the first admin is you, the uploader is a Contributor", async () => {
    const b = await boot();
    const byName = Object.fromEntries(b.members.map((m: { name: string }) => [m.name, m]));
    expect(b.me).toBe(byName["Dana Admin"].id);
    expect(byName["Alt Uploader"].roles.sort()).toEqual(["Contributor", "Member"]);
    expect(byName["Reg Player"]).toMatchObject({ position: "F", rating: 60, roles: ["Member"], status: "active" });
    expect(b.actions).toContain("manage:all");
  });

  it("doesn't make the Fridays twice when opened again", async () => {
    await boot();
    expect((await boot()).sessions).toHaveLength(12);
  });
});

describe("the schedule", () => {
  it("an admin cancels Christmas Day's Friday, and can restore it", async () => {
    const xmas = (await boot()).sessions.find((s: { heldOn: string }) => s.heldOn === "2026-12-25");
    expect((await call("POST", `/api/sessions/${xmas.id}/cancelled`, { cancelled: true })).status).toBe(200);
    expect((await boot()).sessions.find((s: { id: number }) => s.id === xmas.id).cancelledAt).toBe(NOW.toISOString());
    await call("POST", `/api/sessions/${xmas.id}/cancelled`, { cancelled: false });
    expect((await boot()).sessions.find((s: { id: number }) => s.id === xmas.id).cancelledAt).toBeNull();
  });

  it("moving training to Thursdays drops the untouched Fridays but keeps a cancelled one, for whoever signed up", async () => {
    const b = await boot();
    const friday = b.series[0];
    const xmas = b.sessions.find((s: { heldOn: string }) => s.heldOn === "2026-12-25");
    await call("POST", `/api/sessions/${xmas.id}/cancelled`, { cancelled: true });
    const res = await call("PUT", `/api/series/${friday.id}`, { ...friday, weekdays: ["thu"] });
    expect(res.status).toBe(200);
    const days = (await boot()).sessions.map((s: { heldOn: string }) => s.heldOn);
    // Thursdays from the series' first date on (8 October is before it)
    expect(days).toContain("2026-10-15");
    expect(days).not.toContain("2026-10-08");
    expect(days).toContain("2026-12-25");
    expect(days).not.toContain("2026-10-09");
  });

  it("a new training gets its own sessions and a slug", async () => {
    const res = await call("POST", "/api/series", {
      name: "Sunday Skills",
      shortName: "Sunday",
      icon: "skate",
      tone: "green",
      repeatEvery: 1,
      weekdays: ["sun"],
      startsOn: "2026-10-11",
      endsOn: null,
      startTime: "10:00",
      endTime: "11:30",
      venue: "The park",
      capacity: 16,
      goalieCapacity: null,
      public: false,
      active: true,
    });
    expect(res).toMatchObject({ status: 201, body: { slug: "sunday" } });
    const sundays = (await boot()).sessions.filter((s: { seriesId: number }) => s.seriesId === res.body.id);
    expect(sundays).toHaveLength(12);
  });

  it("schedules the first Kumite, and adds a one-off event", async () => {
    const kumite = (await boot()).tournamentTypes[0];
    const t = await call("POST", "/api/tournaments", {
      typeId: kumite.id,
      name: "Winter Kumite",
      location: "Battersea Sports Centre",
      heldOn: "2026-12-05",
      startTime: "11:00",
      endTime: "16:00",
      capacity: null,
      status: "planned",
      feePence: 0,
    });
    expect(t.status).toBe(201);
    const e = await call("POST", "/api/club-events", {
      title: "Kit day",
      startsAt: "2026-10-24T10:00:00.000Z",
      endsAt: "2026-10-24T12:00:00.000Z",
      venue: "",
      signup: false,
      capacity: null,
    });
    expect(e.status).toBe(201);
    const b = await boot();
    expect(b.tournaments.map((x: { name: string }) => x.name)).toEqual(["Winter Kumite"]);
    expect(b.clubEvents.map((x: { title: string }) => x.title)).toEqual(["Kit day"]);
  });

  it("refuses a training with no days, saying why", async () => {
    const friday = (await boot()).series[0];
    expect(await call("PUT", `/api/series/${friday.id}`, { ...friday, weekdays: [] })).toEqual({
      status: 400,
      body: { error: "weekdays should list at least one day." },
    });
  });
});

describe("members and roles", () => {
  it("an admin changes a player's position, rating and roles", async () => {
    const reg = (await boot()).members.find((m: { name: string }) => m.name === "Reg Player");
    const res = await call("PUT", `/api/members/${reg.id}`, {
      ...reg,
      position: "G",
      rating: 70,
      roles: ["Member", "Door"],
    });
    expect(res.status).toBe(200);
    const after = (await boot()).members.find((m: { id: number }) => m.id === reg.id);
    expect(after).toMatchObject({ position: "G", rating: 70 });
    expect(after.roles.sort()).toEqual(["Door", "Member"]);
  });

  it("won't take Admin from the last admin", async () => {
    const dana = (await boot()).members.find((m: { name: string }) => m.name === "Dana Admin");
    expect(await call("PUT", `/api/members/${dana.id}`, { ...dana, roles: ["Member"] })).toEqual({
      status: 409,
      body: { error: "That's the last admin. Make someone else an admin first." },
    });
  });

  it("an admin adds a role with its actions; the Admin role itself can't be changed", async () => {
    const created = await call("POST", "/api/roles", { name: "Coach", description: "", actions: ["generate:Teams"] });
    expect(created.status).toBe(201);
    const roles = (await boot()).roles;
    expect(roles.find((r: { name: string }) => r.name === "Coach").actions).toEqual(["generate:Teams"]);
    const admin = roles.find((r: { name: string }) => r.name === "Admin");
    expect((await call("PUT", `/api/roles/${admin.id}`, { ...admin, actions: [] })).status).toBe(409);
  });
});

describe("who's in", () => {
  const people = async () => {
    const b = await boot();
    const byName = Object.fromEntries(b.members.map((m: { name: string; id: number }) => [m.name, m.id]));
    return { b, dana: byName["Dana Admin"], alt: byName["Alt Uploader"], reg: byName["Reg Player"] };
  };
  const friday = async () => (await boot()).sessions[0];

  it("you say you're in for Friday, and it's still there when the app opens again", async () => {
    const { dana } = await people();
    const s = await friday();
    expect((await call("POST", `/api/sessions/${s.id}/answer`, { answer: "in" })).status).toBe(200);
    expect(await friday()).toMatchObject({ going: [dana], waitlist: [], out: [] });
  });

  it("saying out is an answer of its own, not the same as not answering", async () => {
    const { dana } = await people();
    const s = await friday();
    expect(s).toMatchObject({ going: [], out: [] });
    await call("POST", `/api/sessions/${s.id}/answer`, { answer: "out" });
    expect(await friday()).toMatchObject({ going: [], out: [dana] });
  });

  it("a full social puts the next one on the waitlist, who moves up when someone drops out", async () => {
    const { dana, alt } = await people();
    await call("POST", "/api/club-events", {
      title: "Curry night",
      startsAt: "2026-10-24T19:00:00.000Z",
      endsAt: "2026-10-24T22:00:00.000Z",
      venue: "",
      signup: true,
      capacity: 1,
    });
    const event = (await boot()).clubEvents[0];
    await call("POST", `/api/club-events/${event.id}/players`, { memberId: alt, in: true });
    await call("POST", `/api/club-events/${event.id}/answer`, { answer: "in" });
    expect((await boot()).clubEvents[0]).toMatchObject({ going: [alt], waitlist: [dana] });
    await call("POST", `/api/club-events/${event.id}/players`, { memberId: alt, in: false });
    expect((await boot()).clubEvents[0]).toMatchObject({ going: [dana], waitlist: [] });
  });

  it("an admin adds a player who texted instead, and takes one off", async () => {
    const { alt, reg } = await people();
    const s = await friday();
    await call("POST", `/api/sessions/${s.id}/players`, { memberId: alt, in: true });
    await call("POST", `/api/sessions/${s.id}/players`, { memberId: reg, in: true });
    await call("POST", `/api/sessions/${s.id}/players`, { memberId: alt, in: false });
    expect(await friday()).toMatchObject({ going: [reg] });
  });

  it("the register on the night: a no-show stays signed up, a walk-in joins, and a mistaken tick comes off", async () => {
    const { alt, reg } = await people();
    const s = await friday();
    await call("POST", `/api/sessions/${s.id}/players`, { memberId: reg, in: true });
    await call("POST", `/api/sessions/${s.id}/register`, { memberId: reg, here: false });
    await call("POST", `/api/sessions/${s.id}/register`, { memberId: alt, here: true });
    expect(await friday()).toMatchObject({ going: [reg, alt], walkIns: [alt], noShows: [reg] });
    await call("POST", `/api/sessions/${s.id}/register`, { memberId: alt, here: false });
    await call("POST", `/api/sessions/${s.id}/register`, { memberId: reg, here: true });
    expect(await friday()).toMatchObject({ going: [reg], walkIns: [], noShows: [] });
  });

  it("won't take sign-ups for a cancelled Friday", async () => {
    const s = await friday();
    await call("POST", `/api/sessions/${s.id}/cancelled`, { cancelled: true });
    expect(await call("POST", `/api/sessions/${s.id}/answer`, { answer: "in" })).toEqual({
      status: 409,
      body: { error: "That session's cancelled." },
    });
  });

  it("moving training to Thursdays keeps a Friday someone already said they're in for", async () => {
    const b = await boot();
    const first = b.sessions[0];
    await call("POST", `/api/sessions/${first.id}/answer`, { answer: "in" });
    await call("PUT", `/api/series/${b.series[0].id}`, { ...b.series[0], weekdays: ["thu"] });
    const days = (await boot()).sessions.map((s: { heldOn: string }) => s.heldOn);
    expect(days).toContain(first.heldOn);
  });
});

describe("access", () => {
  it("answers nobody until sign-in exists, except on a local dev server", async () => {
    expect((await call("GET", "/api/bootstrap", undefined, { DB: env.DB })).status).toBe(401);
  });

  it("every route declares an action from the catalog", () => {
    for (const r of ROUTES) expect(r.action === "authenticated" || r.action in ACTIONS).toBe(true);
  });
});
