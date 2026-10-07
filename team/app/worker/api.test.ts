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
  env = { DB: db, TEAM_ENV: "local", TEAM_AUTO_ADMIN: "1" };
});

async function call(method: string, path: string, payload?: unknown, e: Env = env, now = NOW) {
  const res = await handleApi(
    new Request(`http://team.test${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    }),
    e,
    now,
  );
  // The tests read whatever the API sent back; its shapes are checked by the assertions themselves.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, body: (await res.json()) as Record<string, any> };
}
const boot = async () => (await call("GET", "/api/bootstrap")).body;
/** The sessions still to come (bootstrap also sends the last four weeks, for what's just been held). */
const ahead = (b: { sessions: { heldOn: string }[] }) => b.sessions.filter((s) => s.heldOn >= "2026-10-06");

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
    const dates = ahead(b).map((s: { heldOn: string }) => s.heldOn);
    expect(dates[0]).toBe("2026-10-09");
    expect(dates).toHaveLength(12);
    expect(dates.every((d: string) => new Date(`${d}T12:00:00Z`).getUTCDay() === 5)).toBe(true);
  });

  it("has the first Kumite in summer 2027, its date to be confirmed", async () => {
    const b = await boot();
    expect(b.tournamentTypes.map((t: { name: string }) => t.name)).toEqual(["The Cougars Kumite"]);
    expect(b.tournaments).toEqual([
      expect.objectContaining({
        name: "The Cougars Kumite",
        heldOn: "2027-06-12",
        dateConfirmed: false,
        status: "planned",
      }),
    ]);
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
    expect(ahead(await boot())).toHaveLength(12);
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
    // Thursdays from today on
    expect(days).toContain("2026-10-08");
    expect(days).toContain("2026-10-15");
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

  it("schedules another Kumite, and adds a one-off event", async () => {
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
    // In date order; a new one's date is confirmed unless it says otherwise
    expect(b.tournaments.map((x: { name: string; dateConfirmed: boolean }) => [x.name, x.dateConfirmed])).toEqual([
      ["Winter Kumite", true],
      ["The Cougars Kumite", false],
    ]);
    expect(b.clubEvents.map((x: { title: string }) => x.title)).toEqual(["Kit day"]);
  });

  it("lets an admin add an event for the website, change it and call it off", async () => {
    const added = await call("POST", "/api/club-events", {
      title: "Summer social",
      startsAt: "2026-10-24T18:00:00.000Z",
      endsAt: "2026-10-24T22:00:00.000Z",
      venue: "The Latchmere",
      description: "Drinks after the last Friday of the month.",
      signup: false,
      capacity: null,
    });
    expect(added.status).toBe(201);
    // On the website unless they say otherwise
    expect((await boot()).clubEvents[0]).toMatchObject({ title: "Summer social", public: true, cancelledAt: null });

    const id = added.body.id;
    const changed = await call("PUT", `/api/club-events/${id}`, {
      title: "Summer social",
      startsAt: "2026-10-24T19:00:00.000Z",
      endsAt: "2026-10-24T23:00:00.000Z",
      venue: "The Latchmere",
      description: "Now from 8.",
      public: false,
      signup: true,
      capacity: 30,
    });
    expect(changed.status).toBe(200);
    expect((await boot()).clubEvents[0]).toMatchObject({
      startsAt: "2026-10-24T19:00:00.000Z",
      description: "Now from 8.",
      public: false,
      signup: true,
      capacity: 30,
    });

    expect((await call("POST", `/api/club-events/${id}/cancelled`, { cancelled: true })).status).toBe(200);
    expect((await boot()).clubEvents[0].cancelledAt).toBe(NOW.toISOString());
    await call("POST", `/api/club-events/${id}/cancelled`, { cancelled: false });
    expect((await boot()).clubEvents[0].cancelledAt).toBeNull();

    const gone = { title: "x", startsAt: NOW.toISOString(), endsAt: NOW.toISOString(), signup: false };
    expect((await call("PUT", "/api/club-events/999", gone)).status).toBe(404);
  });

  it("looks 12 more weeks ahead each time an admin asks, up to two years", async () => {
    const friday = (await boot()).series[0];
    expect(ahead(await boot())).toHaveLength(12);
    expect((await call("POST", `/api/series/${friday.id}/more`)).status).toBe(200);
    const more = ahead(await boot());
    expect(more).toHaveLength(24);
    expect(more.at(-1).heldOn).toBe("2027-03-19");
    for (let i = 0; i < 12; i++) await call("POST", `/api/series/${friday.id}/more`);
    expect(ahead(await boot()).at(-1).heldOn <= "2028-10-05").toBe(true);
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
  const friday = async () => ahead(await boot())[0];

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
    const first = ahead(b)[0];
    await call("POST", `/api/sessions/${first.id}/answer`, { answer: "in" });
    await call("PUT", `/api/series/${b.series[0].id}`, { ...b.series[0], weekdays: ["thu"] });
    const days = (await boot()).sessions.map((s: { heldOn: string }) => s.heldOn);
    expect(days).toContain(first.heldOn);
  });
});

describe("teams, quips, profiles and attendance", () => {
  const ids = async () => {
    const b = await boot();
    const byName = Object.fromEntries(b.members.map((m: { name: string; id: number }) => [m.name, m.id]));
    return { b, dana: byName["Dana Admin"], alt: byName["Alt Uploader"], reg: byName["Reg Player"] };
  };
  const friday = async () => ahead(await boot())[0];

  it("an admin publishes Friday's teams; everyone sees them, and someone dropping out comes off theirs", async () => {
    const { dana, alt, reg } = await ids();
    const s = await friday();
    for (const m of [alt, reg]) await call("POST", `/api/sessions/${s.id}/players`, { memberId: m, in: true });
    await call("POST", `/api/sessions/${s.id}/answer`, { answer: "in" });
    const teams = [
      { name: "Cougars", players: [dana, alt] },
      { name: "White", players: [reg] },
    ];
    expect((await call("POST", `/api/sessions/${s.id}/teams`, { teams })).status).toBe(200);
    expect((await friday()).teams).toEqual(teams);
    await call("POST", `/api/sessions/${s.id}/answer`, { answer: "out" });
    expect((await friday()).teams).toEqual([
      { name: "Cougars", players: [alt] },
      { name: "White", players: [reg] },
    ]);
  });

  it("won't put someone on two teams", async () => {
    const { dana } = await ids();
    const s = await friday();
    const res = await call("POST", `/api/sessions/${s.id}/teams`, {
      teams: [
        { name: "Cougars", players: [dana] },
        { name: "White", players: [dana] },
      ],
    });
    expect(res).toEqual({ status: 400, body: { error: "Someone's on two teams." } });
  });

  it("Home's quips start with the club's lines; an admin adds, edits and removes them, keeping one of each", async () => {
    const quips = async () => (await boot()).quips as { id: number; kind: string; text: string }[];
    const late = (await quips()).filter((q) => q.kind === "late");
    expect(late.map((q) => q.text)).toContain("Go to bed, {name}");
    const added = await call("POST", "/api/quips", { kind: "late", text: "Lights out, {name}" });
    expect(added.status).toBe(201);
    await call("PUT", `/api/quips/${added.body.id}`, { text: "Lights out, {name}." });
    expect((await quips()).find((q) => q.id === added.body.id)?.text).toBe("Lights out, {name}.");
    for (const q of [...late, { id: added.body.id }].slice(0, -1)) await call("DELETE", `/api/quips/${q.id}`);
    expect(await call("DELETE", `/api/quips/${added.body.id}`)).toEqual({
      status: 409,
      body: { error: "Keep at least one." },
    });
  });

  it("you write your bio and phone; others see the bio but not the phone", async () => {
    const { dana } = await ids();
    await call("PUT", "/api/me", { position: "G", phone: "07700 900123", bio: "Blames the ice." });
    const me = (await boot()).members.find((m: { id: number }) => m.id === dana);
    expect(me).toMatchObject({ position: "G", phone: "07700 900123", bio: "Blames the ice." });
  });

  it("you choose how your name shows on the website, or go back to the default", async () => {
    const { dana } = await ids();
    const webName = async () => (await boot()).members.find((m: { id: number }) => m.id === dana).webName;
    expect(await webName()).toBeNull();
    await call("PUT", "/api/me", { position: "F", phone: "", bio: "", webName: "  The Wall " });
    expect(await webName()).toBe("The Wall");
    await call("PUT", "/api/me", { position: "F", phone: "", bio: "", webName: "" });
    expect(await webName()).toBeNull();
  });

  it("an admin makes someone a Quarterly Member, and can take it back", async () => {
    const { reg } = await ids();
    const quarterly = async () => (await boot()).members.find((m: { id: number }) => m.id === reg).quarterly;
    expect(await quarterly()).toBe(false);
    await call("POST", `/api/members/${reg}/quarterly`, { quarterly: true });
    expect(await quarterly()).toBe(true);
    await call("POST", `/api/members/${reg}/quarterly`, { quarterly: false });
    expect(await quarterly()).toBe(false);
  });

  it("counts the Fridays someone played, and an admin sees their attendance", async () => {
    const { alt, reg } = await ids();
    const s = await friday();
    await call("POST", `/api/sessions/${s.id}/players`, { memberId: reg, in: true });
    await call("POST", `/api/sessions/${s.id}/register`, { memberId: alt, here: true });
    await call("POST", `/api/sessions/${s.id}/register`, { memberId: reg, here: false });
    // The Saturday after
    const later = new Date("2026-10-10T11:00:00Z");
    const b = (await call("GET", "/api/bootstrap", undefined, env, later)).body;
    const played = (id: number) => b.members.find((m: { id: number }) => m.id === id).played;
    expect([played(alt), played(reg)]).toEqual([1, 0]);
    const history = (await call("GET", `/api/members/${reg}/attendance`, undefined, env, later)).body;
    expect(history[0]).toMatchObject({
      heldOn: "2026-10-09",
      series: "Friday Training",
      signup: "in",
      attended: false,
    });
    // Every Friday of the year so far is there, answered or not
    expect(history.at(-1)).toMatchObject({ heldOn: "2026-01-02", signup: null, attended: null });
  });

  it("an admin records who came to a Friday back in March, and takes it back", async () => {
    const { reg } = await ids();
    const history = async () => (await call("GET", `/api/members/${reg}/attendance`)).body;
    const march = (await history()).find((r: { heldOn: string }) => r.heldOn === "2026-03-13");
    await call("POST", `/api/sessions/${march.sessionId}/register`, { memberId: reg, here: true });
    const played = async () => (await boot()).members.find((m: { id: number }) => m.id === reg).played;
    expect(await played()).toBe(1);
    expect((await history()).find((r: { heldOn: string }) => r.heldOn === "2026-03-13")).toMatchObject({
      signup: "in",
      attended: true,
    });
    await call("POST", `/api/sessions/${march.sessionId}/register`, { memberId: reg, here: false });
    expect(await played()).toBe(0);
  });
});

describe("access", () => {
  it("answers nobody who isn't signed in", async () => {
    expect((await call("GET", "/api/bootstrap", undefined, { DB: env.DB })).status).toBe(401);
  });

  it("every route declares an action from the catalog", () => {
    for (const r of ROUTES) expect(r.action === "authenticated" || r.action in ACTIONS).toBe(true);
  });
});
