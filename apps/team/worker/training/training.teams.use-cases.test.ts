// Friday's teams (ADR 0076): only some people make them. Making and publishing teams is a role, Session lead, that an
// admin gives a member; everyone else sees the teams once they're out. Driven through the real Worker handlers
// (ADR 0031).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testWorld } from "../testing";

const ROSTER = [
  { name: "Tess Teams", position: "F", rating: 60, email: "tess@example.com", roles: ["Session lead"] },
  { name: "Dana Admin", position: "D", rating: 75, email: "dana@example.com", roles: ["Admin"] },
  { name: "Mo Member", position: "D", rating: 55, email: "mo@example.com" },
];

let w: ReturnType<typeof testWorld>;
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  w = testWorld(ROSTER);
});

// The next Friday session, and two teams from whoever's on the roster
async function teamsFor(b: Awaited<ReturnType<typeof w.signedIn>>) {
  const boot = (await b.call("GET", "/api/bootstrap")).body;
  const session = boot.sessions.at(-1);
  const id = (name: string) => boot.members.find((m: { name: string }) => m.name === name).id;
  const [tess, mo] = [id("Tess Teams"), id("Mo Member")];
  return {
    session,
    teams: [
      { name: "Black", players: [tess] },
      { name: "White", players: [mo] },
    ],
  };
}

describe("making Friday's teams", () => {
  it("a team maker sees ratings, and publishes teams everyone then sees", async () => {
    const tess = await w.signedIn("tess@example.com");
    const boot = (await tess.call("GET", "/api/bootstrap")).body;
    expect(boot.actions).toEqual(expect.arrayContaining(["generate:Teams", "publish:Teams", "read:Rating"]));
    expect(boot.members.every((m: { rating?: number }) => typeof m.rating === "number")).toBe(true);
    const { session, teams } = await teamsFor(tess);
    expect((await tess.call("POST", `/api/sessions/${session.id}/teams`, { teams })).status).toBe(200);

    const mo = await w.signedIn("mo@example.com");
    const seen = (await mo.call("GET", "/api/bootstrap")).body.sessions.find(
      (s: { id: number }) => s.id === session.id,
    );
    expect(seen.teams.map((t: { name: string }) => t.name)).toEqual(["Black", "White"]);
  });

  // No drafts (ADR 0076): each move a team maker makes is saved as they make it, and everyone sees it
  it("a team maker moves a player and everyone sees it straight away", async () => {
    const tess = await w.signedIn("tess@example.com");
    const { session, teams } = await teamsFor(tess);
    await tess.call("POST", `/api/sessions/${session.id}/teams`, { teams });
    const [black, white] = teams;
    const moved = [
      { name: "Black", players: [] },
      { name: "White", players: [...white.players, ...black.players] },
    ];
    expect((await tess.call("POST", `/api/sessions/${session.id}/teams`, { teams: moved })).status).toBe(200);

    const mo = await w.signedIn("mo@example.com");
    const seen = (await mo.call("GET", "/api/bootstrap")).body.sessions.find(
      (s: { id: number }) => s.id === session.id,
    );
    expect(seen.teams).toEqual(moved);
  });

  it("a member can't make or publish them", async () => {
    const mo = await w.signedIn("mo@example.com");
    expect((await mo.call("GET", "/api/bootstrap")).body.actions).not.toContain("publish:Teams");
    const { session, teams } = await teamsFor(mo);
    expect((await mo.call("POST", `/api/sessions/${session.id}/teams`, { teams })).status).toBe(403);
  });
});

describe("starting a session again", () => {
  const fridayOf = async (b: Awaited<ReturnType<typeof w.signedIn>>, id: number) =>
    (await b.call("GET", "/api/bootstrap")).body.sessions.find((s: { id: number }) => s.id === id);

  it("a team maker takes the teams down; the sign-ups stay", async () => {
    const tess = await w.signedIn("tess@example.com");
    const { session, teams } = await teamsFor(tess);
    await tess.call("POST", `/api/sessions/${session.id}/answer`, { answer: "in" });
    await tess.call("POST", `/api/sessions/${session.id}/teams`, { teams });
    expect((await tess.call("DELETE", `/api/sessions/${session.id}/teams`)).status).toBe(200);
    const after = await fridayOf(tess, session.id);
    expect(after.teams).toEqual([]);
    expect(after.going.length).toBe(1);
  });

  it("an admin resets it: nobody's in or waiting, and no teams", async () => {
    const dana = await w.signedIn("dana@example.com");
    const { session, teams } = await teamsFor(dana);
    await dana.call("POST", `/api/sessions/${session.id}/answer`, { answer: "in" });
    await dana.call("POST", `/api/sessions/${session.id}/teams`, { teams });
    expect((await dana.call("POST", `/api/sessions/${session.id}/reset`)).status).toBe(200);
    const after = await fridayOf(dana, session.id);
    expect(after.teams).toEqual([]);
    expect(after.going).toEqual([]);
    expect(after.waitlist).toEqual([]);
  });

  it("a member can do neither", async () => {
    const mo = await w.signedIn("mo@example.com");
    const { session } = await teamsFor(mo);
    expect((await mo.call("DELETE", `/api/sessions/${session.id}/teams`)).status).toBe(403);
    expect((await mo.call("POST", `/api/sessions/${session.id}/reset`)).status).toBe(403);
  });
});
