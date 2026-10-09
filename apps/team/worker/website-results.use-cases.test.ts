// A tournament's results on the website (ADR 0100): once its last game is played, anyone can see it on the website,
// read live from the same D1: the champions, the table, every score and who scored. Award winners show once an admin
// confirms them. Players go by the name they chose; nobody's full name leaves the database. Driven through the real
// Worker handlers (ADR 0031), read through the website's own module.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { crestOf, publishedEdition, publishedEditions } from "../../../apps/web/src/lib/server/results";
import { testWorld } from "./testing";

const ROSTER = [
  { name: "Dana Admin", position: "D", rating: 75, email: "dana@example.com", roles: ["Admin"] },
  { name: "Cara Captain", position: "F", rating: 70, email: "cara@example.com" },
  { name: "Cole Captain", position: "D", rating: 68, email: "cole@example.com" },
  { name: "Reg Player", position: "F", rating: 60, email: "reg@example.com" },
  { name: "Mo Member", position: "G", rating: 55, email: "mo@example.com" },
];
const FULL_NAMES = /Dana Admin|Cara Captain|Cole Captain|Reg Player|Mo Member/;
const CREST = "data:image/png;base64,iVBORw0KGgo=";

let w: ReturnType<typeof testWorld>;
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  w = testWorld(ROSTER);
});

/** A cup two teams entered: the Ants (Cara, with Reg) and the Bees (Cole, with Mo), one game between them. */
async function cup(changes: object = {}) {
  const dana = await w.signedIn("dana@example.com");
  // Who's who, straight from the database: the story is the website's, not the app's pages
  const one = (sql: string, ...p: unknown[]) => (w.db.raw.prepare(sql).get(...p) as { id: number }).id;
  const idOf = (name: string) => one("SELECT id FROM members WHERE name = ?", name);
  const res = await dana.call("POST", "/api/tournaments", {
    name: "Summer Cup",
    location: "Battersea Park",
    heldOn: "2026-09-12",
    startTime: "10:00",
    endTime: "15:00",
    status: "planned",
    feePence: 0,
    kind: "teams",
    playoffs: [],
    awards: [
      { name: "Champions", about: "Top of the table." },
      { name: "Top scorer", about: "Most goals." },
    ],
    teams: [
      { name: "Ants", logo: CREST, captainMemberId: idOf("Cara Captain"), players: [{ memberId: idOf("Reg Player") }] },
      { name: "Bees", logo: null, captainMemberId: idOf("Cole Captain"), players: [{ memberId: idOf("Mo Member") }] },
    ],
    ...changes,
  });
  expect(res.status).toBe(201);
  const id = res.body.id as number;
  expect((await dana.call("POST", `/api/tournaments/${id}/fixtures`)).status).toBe(200);
  const team = (name: string) => one("SELECT id FROM tournament_teams WHERE tournament_id = ? AND name = ?", id, name);
  const [ants, bees] = [team("Ants"), team("Bees")];
  const game = one("SELECT id FROM tournament_games WHERE tournament_id = ?", id);
  const goal = (teamId: number, scorer: string, assist?: string) =>
    dana.call("POST", `/api/tournaments/${id}/games/${game}/goals`, {
      teamId,
      scorerId: idOf(scorer),
      assistId: assist ? idOf(assist) : null,
    });
  /** The game's played: 0–0 at full time, then the admin puts in who scored, 2–1 to the Ants. */
  const play = async () => {
    expect(
      (await dana.call("PUT", `/api/tournaments/${id}/games/${game}`, { homeGoals: 0, awayGoals: 0 })).status,
    ).toBe(200);
    for (const [team, scorer, assist] of [
      [ants, "Cara Captain", "Reg Player"],
      [ants, "Cara Captain"],
      [bees, "Cole Captain"],
    ] as const)
      expect((await goal(team, scorer, assist)).status).toBe(200);
  };
  const confirm = (list: object[]) => dana.call("PUT", `/api/tournaments/${id}/winners`, { winners: list });
  return { dana, id, idOf, ants, bees, play, confirm };
}

describe("tournament results on the website", () => {
  it("once the last game's played, anyone sees the champions, the table, the score and who scored", async () => {
    const cara = await w.signedIn("cara@example.com");
    expect((await cara.call("PUT", "/api/me", { position: "F", webName: "The Wall" })).status).toBe(200);
    const { id, play } = await cup();
    await play();

    const list = await publishedEditions(w.db);
    expect(list).toEqual([
      expect.objectContaining({ id, name: "Summer Cup", heldOn: "2026-09-12", champions: "Ants" }),
    ]);

    const r = (await publishedEdition(w.db, id))!;
    expect(r.champions).toBe("Ants");
    expect(r.table.map((x) => [x.name, x.p, x.w, x.l, x.gf, x.ga, x.pts])).toEqual([
      ["Ants", 1, 1, 0, 2, 1, 3],
      ["Bees", 1, 0, 1, 1, 2, 0],
    ]);
    expect(r.games).toHaveLength(1);
    const g = r.games[0];
    expect(g.home === "Ants" ? [g.homeGoals, g.awayGoals] : [g.awayGoals, g.homeGoals]).toEqual([2, 1]);
    // By the name they chose; else first name and initial
    expect(r.scorers).toEqual([
      { name: "The Wall", team: "Ants", goals: 2, assists: 0 },
      { name: "Cole C.", team: "Bees", goals: 1, assists: 0 },
      { name: "Reg P.", team: "Ants", goals: 0, assists: 1 },
    ]);
    expect(r.teams.map((x) => [x.name, x.players])).toEqual([
      ["Ants", ["The Wall", "Reg P."]],
      ["Bees", ["Cole C.", "Mo M."]],
    ]);
    expect(JSON.stringify([list, r])).not.toMatch(FULL_NAMES);
  });

  it("award winners show once an admin confirms them, not before", async () => {
    const { id, idOf, ants, play, confirm } = await cup();
    await play();
    expect((await publishedEdition(w.db, id))!.awards).toEqual([
      { name: "Champions", about: "Top of the table.", winners: [] },
      { name: "Top scorer", about: "Most goals.", winners: [] },
    ]);
    expect(
      (
        await confirm([
          { award: "Champions", teamId: ants },
          { award: "Top scorer", memberId: idOf("Cara Captain") },
        ])
      ).status,
    ).toBe(200);
    const r = (await publishedEdition(w.db, id))!;
    expect(r.awards).toEqual([
      { name: "Champions", about: "Top of the table.", winners: ["Ants"] },
      { name: "Top scorer", about: "Most goals.", winners: ["Cara C."] },
    ]);
    expect((await publishedEditions(w.db))[0].awards).toEqual(r.awards);
  });

  it("a tournament still to play, or one kept off the website, isn't there", async () => {
    const coming = await cup();
    expect(await publishedEditions(w.db)).toEqual([]);
    expect(await publishedEdition(w.db, coming.id)).toBeNull();

    const hidden = await cup({ name: "Members' Cup", public: false });
    await hidden.play();
    expect(await publishedEdition(w.db, hidden.id)).toBeNull();
    expect(await publishedEditions(w.db)).toEqual([]);
  });

  it("a player who changes the name they go by changes it on the results too", async () => {
    const { id, play } = await cup();
    await play();
    expect((await publishedEdition(w.db, id))!.scorers[0].name).toBe("Cara C.");
    const cara = await w.signedIn("cara@example.com");
    await cara.call("PUT", "/api/me", { position: "F", webName: "Cara Captain" });
    expect((await publishedEdition(w.db, id))!.scorers[0].name).toBe("Cara Captain");
  });

  it("a team's crest is served only once its tournament is on the website", async () => {
    const { ants, bees, play } = await cup();
    expect(await crestOf(w.db, ants)).toBeNull();
    await play();
    expect(await crestOf(w.db, ants)).toBe(CREST);
    expect(await crestOf(w.db, bees)).toBeNull();
    const r = (await publishedEditions(w.db))[0];
    expect(r.championsCrest).toBe(ants);
  });
});
