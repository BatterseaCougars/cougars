// A tournament, from an admin setting it up to its captains drafting their teams (ADR 0031): driven through the real
// Worker handlers in the fake world (testing.ts), with the website's What's on reading the same database.
//
// The story: an admin makes a series with its colour and schedules a tournament in it, with a date and captains. It
// goes on the website, members see it in the app, they can say they're in once sign-up opens, and then the
// captains draft them onto their teams. The last two steps don't work yet: they're `it.fails` until they do.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { whatsOn } from "../../../apps/web/src/lib/server/whats-on";
import { NOW, testWorld } from "./testing";

const ROSTER = [
  { name: "Dana Admin", position: "D", rating: 75, email: "dana@example.com", roles: ["Admin"] },
  { name: "Cara Captain", position: "F", rating: 70, email: "cara@example.com" },
  { name: "Cole Captain", position: "D", rating: 68, email: "cole@example.com" },
  { name: "Reg Player", position: "F", rating: 60, email: "reg@example.com" },
  { name: "Mo Player", position: "G", rating: 55, email: "mo@example.com" },
  { name: "Ash Player", position: "F", rating: 58, email: "ash@example.com" },
  { name: "Bo Player", position: "D", rating: 52, email: "bo@example.com" },
];
/** Draft night: 8 December, after the 5th's sign-up deadline. */
const DRAFT_DAY = new Date("2026-12-08T19:30:00Z");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
let w: ReturnType<typeof testWorld>;
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  w = testWorld(ROSTER);
});

/** Someone signed in, and what's on their screen. */
async function person(email: string) {
  const b = await w.signedIn(email);
  const sees = async (now = NOW) => (await b.call("GET", "/api/bootstrap", undefined, { now })).body as Json;
  const idOf = async (name: string) => (await sees()).members.find((m: Json) => m.name === name).id as number;
  return { call: b.call, sees, idOf };
}

/** The admin: makes the series, schedules the tournament, opens sign-up. */
async function admin() {
  const p = await person("dana@example.com");
  return {
    ...p,
    async makeSeries() {
      const res = await p.call("POST", "/api/tournament-types", {
        name: "Summer Cup",
        shortName: "Cup",
        icon: "trophy",
        tone: "green",
        kind: "draft",
        pointsWin: 3,
        pointsDraw: 1,
        pointsLoss: 0,
        gameMinutes: 12,
        active: true,
        defaultFeePence: 1000,
        awards: [{ name: "Champions", about: "Top of the table." }],
        location: "Battersea Park courts",
      });
      expect(res.status).toBe(201);
      return res.body.id as number;
    },
    async schedule(typeId: number, captains: number[]) {
      const res = await p.call("POST", "/api/tournaments", {
        typeId,
        name: "Winter Cup 2026",
        location: "",
        heldOn: "2026-12-12",
        dateConfirmed: true,
        startTime: "11:00",
        endTime: "16:00",
        capacity: 24,
        status: "planned",
        feePence: 1000,
        signupClosesOn: "2026-12-05",
        draftOn: "2026-12-08",
        draftTime: "19:30",
        teams: captains.map((captainMemberId) => ({ name: "", logo: null, captainMemberId, players: [] })),
      });
      expect(res.status).toBe(201);
      return res.body.id as number;
    },
    async openSignUp(id: number) {
      const t = (await p.sees()).tournaments.find((x: Json) => x.id === id);
      expect((await p.call("PUT", `/api/tournaments/${id}`, { ...t, status: "open" })).status).toBe(200);
    },
  };
}

/** A member: sees the calendar, says they're in. */
async function member(email: string) {
  const p = await person(email);
  return {
    ...p,
    answer: (id: number, a: "in" | "out", now = NOW) =>
      p.call("POST", `/api/tournaments/${id}/answer`, { answer: a }, { now }),
  };
}

/** Set up to the point the story's at: a series, a tournament in it with two captains. */
async function scheduled() {
  const dana = await admin();
  const typeId = await dana.makeSeries();
  const captains = [await dana.idOf("Cara Captain"), await dana.idOf("Cole Captain")];
  const id = await dana.schedule(typeId, captains);
  return { dana, typeId, id, captains };
}

describe("a tournament, from setting it up to the draft", () => {
  it("an admin makes a series with its colour, and schedules a tournament in it with a date and captains", async () => {
    const { dana, typeId, id, captains } = await scheduled();
    const seen = await dana.sees();
    expect(seen.tournamentTypes.find((t: Json) => t.id === typeId)).toMatchObject({
      name: "Summer Cup",
      tone: "green",
      kind: "draft",
    });
    const t = seen.tournaments.find((x: Json) => x.id === id);
    // It copied the series' rules and awards, and keeps its captains in pick order
    expect(t).toMatchObject({ heldOn: "2026-12-12", kind: "draft", gameMinutes: 12, feePence: 1000 });
    expect(t.awards).toEqual([{ name: "Champions", about: "Top of the table." }]);
    expect(t.teams.map((team: Json) => [team.captainMemberId, team.pick])).toEqual([
      [captains[0], 1],
      [captains[1], 2],
    ]);
  });

  it("it goes on the website's What's on, at its series' place", async () => {
    await scheduled();
    const items = await whatsOn(w.db, NOW, { trainings: 0, tournaments: 10, events: 0 });
    expect(items.find((i) => i.title === "Winter Cup 2026")).toMatchObject({
      kind: "tournament",
      startsAt: "2026-12-12T11:00:00.000Z",
      dateTbc: false,
    });
  });

  it("members see it in the app, in its series' colour", async () => {
    const { typeId, id } = await scheduled();
    const reg = await member("reg@example.com");
    const seen = await reg.sees();
    expect(seen.tournaments.find((t: Json) => t.id === id)).toMatchObject({ name: "Winter Cup 2026", typeId });
    expect(seen.tournamentTypes.find((t: Json) => t.id === typeId).tone).toBe("green");
  });

  it("members say they're in once sign-up is open, and not after it closes", async () => {
    const { dana, id } = await scheduled();
    await dana.openSignUp(id);
    const reg = await member("reg@example.com");
    expect((await reg.answer(id, "in")).status).toBe(200);
    const t = (await reg.sees()).tournaments.find((x: Json) => x.id === id);
    expect(t.going).toContain(await reg.idOf("Reg Player"));
    // The day after sign-up closes (5 December), no more
    const mo = await member("mo@example.com");
    expect((await mo.answer(id, "in", new Date("2026-12-06T10:00:00Z"))).status).toBe(409);
  });

  it("members can't say they're in until an admin opens sign-up", async () => {
    const { dana, id } = await scheduled();
    const reg = await member("reg@example.com");
    // Still "Coming up": not yet
    expect((await reg.answer(id, "in")).status).toBe(409);
    expect((await reg.sees()).tournaments.find((x: Json) => x.id === id).going).toEqual([]);
    // Saying you're out is always fine
    expect((await reg.answer(id, "out")).status).toBe(200);
    // Once it's open, they can
    await dana.openSignUp(id);
    expect((await reg.answer(id, "in")).status).toBe(200);
  });

  describe("on draft day, the captains pick the members who signed up", () => {
    /** Signed up and ready to draft: Reg, Mo, Ash and Bo said they're in. */
    async function draftReady() {
      const story = await scheduled();
      await story.dana.openSignUp(story.id);
      for (const who of ["reg", "mo", "ash", "bo"]) await (await member(`${who}@example.com`)).answer(story.id, "in");
      const cara = await member("cara@example.com");
      const cole = await member("cole@example.com");
      const pick = (as: { call: typeof cara.call }, memberId: number, now = DRAFT_DAY) =>
        as.call("POST", `/api/tournaments/${story.id}/draft/picks`, { memberId }, { now });
      const teams = async () =>
        (await story.dana.sees(DRAFT_DAY)).tournaments
          .find((x: Json) => x.id === story.id)
          .teams.map((t: Json) => t.players.map((p: Json) => p.memberId));
      const ids = Object.fromEntries(
        await Promise.all(
          ["Reg", "Mo", "Ash", "Bo", "Dana"].map(async (n) => [
            n,
            await cara.idOf(`${n} ${n === "Dana" ? "Admin" : "Player"}`),
          ]),
        ),
      ) as Record<"Reg" | "Mo" | "Ash" | "Bo" | "Dana", number>;
      return { ...story, cara, cole, pick, teams, ids };
    }

    it("captains take turns in snake order, and each pick lands on their team", async () => {
      const { cara, cole, pick, teams, ids } = await draftReady();
      expect((await pick(cara, ids.Reg)).status).toBe(200);
      expect((await pick(cole, ids.Mo)).status).toBe(200);
      // Snake: Cole picks again, then Cara
      expect((await pick(cole, ids.Ash)).status).toBe(200);
      expect((await pick(cara, ids.Bo)).status).toBe(200);
      expect(await teams()).toEqual([
        [ids.Reg, ids.Bo],
        [ids.Mo, ids.Ash],
      ]);
    });

    it("nobody picks out of turn, and only captains pick", async () => {
      const { cara, cole, pick, teams, ids } = await draftReady();
      expect((await pick(cole, ids.Reg)).status).toBe(409); // Cara's first
      const reg = await member("reg@example.com");
      expect((await pick(reg, ids.Mo)).status).toBe(403); // not a captain
      expect((await pick(cara, ids.Reg)).status).toBe(200);
      expect((await pick(cara, ids.Mo)).status).toBe(409); // now Cole's turn
      expect(await teams()).toEqual([[ids.Reg], []]);
    });

    it("captains only pick members who signed up, each once", async () => {
      const { cara, cole, pick, ids } = await draftReady();
      expect((await pick(cara, ids.Dana)).status).toBe(409); // never said she's in
      expect((await pick(cara, ids.Reg)).status).toBe(200);
      expect((await pick(cole, ids.Reg)).status).toBe(409); // already on Cara's team
    });

    it("the draft doesn't start before draft day", async () => {
      const { cara, pick, teams, ids } = await draftReady();
      expect((await pick(cara, ids.Reg, new Date("2026-12-07T19:30:00Z"))).status).toBe(409);
      expect(await teams()).toEqual([[], []]);
    });

    it("an admin running the draft can pick for the captain on the clock, and undo the last pick", async () => {
      const { dana, id, cole, pick, teams, ids } = await draftReady();
      expect((await pick(dana, ids.Reg)).status).toBe(200); // for Cara
      expect((await pick(cole, ids.Mo)).status).toBe(200);
      expect(
        (await dana.call("DELETE", `/api/tournaments/${id}/draft/picks/last`, undefined, { now: DRAFT_DAY })).status,
      ).toBe(200);
      expect(await teams()).toEqual([[ids.Reg], []]);
      // Cole is on the clock again; a captain can't undo
      expect(
        (await cole.call("DELETE", `/api/tournaments/${id}/draft/picks/last`, undefined, { now: DRAFT_DAY })).status,
      ).toBe(403);
      expect((await pick(cole, ids.Ash)).status).toBe(200);
    });
  });
});
