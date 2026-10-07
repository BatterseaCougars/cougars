// A tournament, from an admin setting it up to its captains drafting their teams (ADR 0031): driven through the real
// Worker handlers in the fake world (testing.ts), with the website's What's on reading the same database.
//
// The story: an admin makes a series with its colour and schedules a tournament in it, with a date and captains. It
// goes on the website, members see it in the app, they can say they're in once sign-up opens, and then an admin
// opens the draft, the captains pick them onto their teams, and the admin closes it.
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
    // (Only the captains are in: they are automatically)
    expect((await reg.sees()).tournaments.find((x: Json) => x.id === id).going).not.toContain(
      await reg.idOf("Reg Player"),
    );
    // Saying you're out is always fine
    expect((await reg.answer(id, "out")).status).toBe(200);
    // Once it's open, they can
    await dana.openSignUp(id);
    expect((await reg.answer(id, "in")).status).toBe(200);
  });

  describe("the draft: an admin opens it, the captains pick the members who signed up, the admin closes it", () => {
    /** Signed up and ready to draft: Reg, Mo, Ash and Bo said they're in. Not yet opened. */
    async function signedUp() {
      const story = await scheduled();
      await story.dana.openSignUp(story.id);
      for (const who of ["reg", "mo", "ash", "bo"]) await (await member(`${who}@example.com`)).answer(story.id, "in");
      const cara = await member("cara@example.com");
      const cole = await member("cole@example.com");
      const draft = (as: { call: typeof cara.call }, what: "open" | "close", body: object = {}) =>
        as.call("POST", `/api/tournaments/${story.id}/draft/${what}`, body, { now: DRAFT_DAY });
      const pick = (as: { call: typeof cara.call }, memberId: number) =>
        as.call("POST", `/api/tournaments/${story.id}/draft/picks`, { memberId }, { now: DRAFT_DAY });
      const undo = (as: { call: typeof cara.call }) =>
        as.call("DELETE", `/api/tournaments/${story.id}/draft/picks/last`, undefined, { now: DRAFT_DAY });
      const tournament = async () =>
        (await story.dana.sees(DRAFT_DAY)).tournaments.find((x: Json) => x.id === story.id);
      const teams = async () => (await tournament()).teams.map((t: Json) => t.players.map((p: Json) => p.memberId));
      const ids = Object.fromEntries(
        await Promise.all(
          ["Reg Player", "Mo Player", "Ash Player", "Bo Player", "Dana Admin", "Cara Captain", "Cole Captain"].map(
            async (n) => [n.split(" ")[0], await cara.idOf(n)],
          ),
        ),
      ) as Record<"Reg" | "Mo" | "Ash" | "Bo" | "Dana" | "Cara" | "Cole", number>;
      return { ...story, cara, cole, draft, pick, undo, tournament, teams, ids };
    }
    /** And opened by the admin. */
    async function draftOpen() {
      const s = await signedUp();
      expect((await s.draft(s.dana, "open")).status).toBe(200);
      return s;
    }

    it("picks wait until an admin opens the draft, and only an admin can open it", async () => {
      const { dana, cara, draft, pick, tournament, ids } = await signedUp();
      expect((await tournament()).draftState).toBe("scheduled");
      expect((await pick(cara, ids.Reg)).status).toBe(409);
      expect((await draft(cara, "open")).status).toBe(403);
      expect((await draft(dana, "open")).status).toBe(200);
      expect((await tournament()).draftState).toBe("open");
      expect((await pick(cara, ids.Reg)).status).toBe(200);
    });

    it("captains are in the tournament automatically, on their own team, and nobody can pick them", async () => {
      const { cara, tournament, pick, ids } = await draftOpen();
      expect((await tournament()).going).toEqual(expect.arrayContaining([ids.Cara, ids.Cole]));
      expect((await pick(cara, ids.Cole)).status).toBe(409);
    });

    it("captains take turns in snake order, and each pick lands on their team", async () => {
      const { cara, cole, pick, teams, ids } = await draftOpen();
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
      const { cara, cole, pick, teams, ids } = await draftOpen();
      expect((await pick(cole, ids.Reg)).status).toBe(409); // Cara's first
      const reg = await member("reg@example.com");
      expect((await pick(reg, ids.Mo)).status).toBe(403); // not a captain
      expect((await pick(cara, ids.Reg)).status).toBe(200);
      expect((await pick(cara, ids.Mo)).status).toBe(409); // now Cole's turn
      expect(await teams()).toEqual([[ids.Reg], []]);
    });

    it("captains only pick members who signed up, each once", async () => {
      const { cara, cole, pick, ids } = await draftOpen();
      expect((await pick(cara, ids.Dana)).status).toBe(409); // never said she's in
      expect((await pick(cara, ids.Reg)).status).toBe(200);
      expect((await pick(cole, ids.Reg)).status).toBe(409); // already on Cara's team
    });

    it("an admin running the draft can pick for the captain on the clock, and undo the last pick", async () => {
      const { dana, cole, pick, undo, teams, ids } = await draftOpen();
      expect((await pick(dana, ids.Reg)).status).toBe(200); // for Cara
      expect((await pick(cole, ids.Mo)).status).toBe(200);
      expect((await undo(dana)).status).toBe(200);
      expect(await teams()).toEqual([[ids.Reg], []]);
      // Cole is on the clock again; a captain can't undo
      expect((await undo(cole)).status).toBe(403);
      expect((await pick(cole, ids.Ash)).status).toBe(200);
    });

    it("saving the tournament mid-draft keeps every pick, and undo still takes the last one", async () => {
      const { dana, id, cara, cole, pick, undo, tournament, teams, ids } = await draftOpen();
      // The admin opened the editor before the picks…
      const editorCopy = await tournament();
      expect((await pick(cara, ids.Reg)).status).toBe(200);
      expect((await pick(cole, ids.Mo)).status).toBe(200);
      // …and saves it (a new team name) after them
      editorCopy.teams[0].name = "Team Red";
      expect((await dana.call("PUT", `/api/tournaments/${id}`, editorCopy, { now: DRAFT_DAY })).status).toBe(200);
      expect(await teams()).toEqual([[ids.Reg], [ids.Mo]]);
      expect((await tournament()).teams[0].name).toBe("Team Red");
      expect((await undo(dana)).status).toBe(200);
      expect(await teams()).toEqual([[ids.Reg], []]);
    });

    it("once the draft is open, the captains' order can't change", async () => {
      const { dana, id, tournament } = await draftOpen();
      const t = await tournament();
      t.teams.reverse();
      expect((await dana.call("PUT", `/api/tournaments/${id}`, t, { now: DRAFT_DAY })).status).toBe(409);
    });

    it("a member who withdraws during the draft comes off their team; once it's closed, they ask an admin", async () => {
      const { dana, id, cara, draft, pick, teams, ids } = await draftOpen();
      expect((await pick(cara, ids.Reg)).status).toBe(200);
      const reg = await member("reg@example.com");
      expect((await reg.answer(id, "out", DRAFT_DAY)).status).toBe(200);
      expect(await teams()).toEqual([[], []]);
      // Cara's pick again (Reg's came back off); close with the rest left out on purpose
      expect((await pick(cara, ids.Mo)).status).toBe(200);
      expect((await draft(dana, "close", { leaveOut: true })).status).toBe(200);
      // On a team once it's closed: withdrawing goes through an admin
      const mo = await member("mo@example.com");
      expect((await mo.answer(id, "out", DRAFT_DAY)).status).toBe(409);
    });

    it("the admin closes the draft once everyone's picked, or leaves the rest out on purpose; then it's locked", async () => {
      const { dana, cara, cole, draft, pick, tournament, ids } = await draftOpen();
      expect((await pick(cara, ids.Reg)).status).toBe(200);
      // Mo, Ash and Bo still to pick
      expect((await draft(dana, "close")).status).toBe(409);
      expect((await draft(cara, "close", { leaveOut: true })).status).toBe(403);
      expect((await draft(dana, "close", { leaveOut: true })).status).toBe(200);
      expect((await tournament()).draftState).toBe("closed");
      // Locked: no more picks, and the captains can't change
      expect((await pick(cole, ids.Mo)).status).toBe(409);
      const t = await tournament();
      t.teams[1].captainMemberId = ids.Ash;
      expect((await dana.call("PUT", `/api/tournaments/${t.id}`, t, { now: DRAFT_DAY })).status).toBe(409);
    });
  });
});
