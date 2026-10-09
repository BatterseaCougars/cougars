// An admin brings the club's players in from a file (a spreadsheet saved as CSV, or the roster's JSON): the app
// checks it first and says who'd be added, who's already in and what's wrong, row by row; then adds them all at once.
// Nobody is emailed. Driven through the real handlers in the fake world (ADR 0031).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { testWorld } from "./testing";

const ROSTER = [
  { name: "Dana Admin", position: "D", rating: 75, email: "dana@example.com", roles: ["Admin"] },
  { name: "Reg Player", position: "F", rating: 60, email: "reg@example.com" },
];
let w: ReturnType<typeof testWorld>;
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  w = testWorld(ROSTER);
});

const CSV = [
  "Name,Email,Position,Rating,Cougar,Roles",
  'Nina New,Nina@Example.com ,G,70,yes,"Session lead; Contributor"',
  "Olly Other,olly@example.com,Defence,,,",
  "Reg Player,reg@example.com,F,60,,",
].join("\r\n");

type Member = {
  name: string;
  position: string;
  rating: number;
  cougar: boolean;
  roles: string[];
  paymentReference: string;
};
const members = async (as: Awaited<ReturnType<typeof w.signedIn>>) =>
  (await as.call("GET", "/api/bootstrap")).body.members as Member[];

describe("an admin imports members from a file", () => {
  it("checking the file says who'd be added and who's in already, and changes nothing", async () => {
    const dana = await w.signedIn("dana@example.com");
    const r = await dana.call("POST", "/api/members/import", { file: CSV });
    expect(r.status).toBe(200);
    expect(r.body.problems).toEqual([]);
    expect(r.body.add.map((p: { name: string }) => p.name)).toEqual(["Nina New", "Olly Other"]);
    expect(r.body.add[0]).toMatchObject({ email: "nina@example.com", position: "G", rating: 70, cougar: true });
    expect(r.body.add[1]).toMatchObject({ position: "D", rating: 50, cougar: false, roles: [] });
    expect(r.body.skip).toEqual([{ row: 4, name: "Reg Player", why: "Already in the club" }]);
    expect((await members(dana)).map((m) => m.name)).not.toContain("Nina New");
  });

  it("importing adds them with their position, rating, Cougar flag, roles and a bank reference", async () => {
    const dana = await w.signedIn("dana@example.com");
    const r = await dana.call("POST", "/api/members/import", { file: CSV, apply: true });
    expect(r.status).toBe(200);
    expect(r.body.added).toEqual(["Nina New", "Olly Other"]);

    const nina = (await members(dana)).find((m) => m.name === "Nina New")!;
    expect(nina).toMatchObject({ position: "G", rating: 70, cougar: true, paymentReference: "COUGARS NINA N" });
    expect(nina.roles).toEqual(expect.arrayContaining(["Member", "Session lead", "Contributor"]));
    // Nobody's emailed: the admin tells the club when the app's ready
    expect(vi.mocked(console.log).mock.calls.some((c) => String(c[0]).includes("mail.logged"))).toBe(false);
  });

  it("they sign in with the email in the file, as anyone does", async () => {
    const dana = await w.signedIn("dana@example.com");
    await dana.call("POST", "/api/members/import", { file: CSV, apply: true });
    const phone = w.browser();
    const { devCode } = await w.ask(phone, "nina@example.com");
    expect((await phone.call("POST", "/api/auth/verify", { code: devCode })).status).toBe(200);
  });

  it("importing the same file again adds nobody twice", async () => {
    const dana = await w.signedIn("dana@example.com");
    await dana.call("POST", "/api/members/import", { file: CSV, apply: true });
    const again = await dana.call("POST", "/api/members/import", { file: CSV, apply: true });
    expect(again.body.added).toEqual([]);
    expect((await members(dana)).filter((m) => m.name === "Nina New")).toHaveLength(1);
  });

  it("the roster's JSON works too", async () => {
    const dana = await w.signedIn("dana@example.com");
    const json = JSON.stringify([
      { name: "Jo Json", email: "jo@example.com", position: "F", rating: 40, roles: ["Admin"] },
    ]);
    expect((await dana.call("POST", "/api/members/import", { file: json, apply: true })).body.added).toEqual([
      "Jo Json",
    ]);
    expect((await members(dana)).find((m) => m.name === "Jo Json")!.roles).toContain("Admin");
  });

  it("a spreadsheet's CSV as Excel saves it: a byte-order mark, quoted commas, Windows line ends", async () => {
    const dana = await w.signedIn("dana@example.com");
    const excel = '﻿Name,Email,Roles\r\n"Smith, Jo",jo.smith@example.com,"Session lead;Admin"\r\n';
    const r = await dana.call("POST", "/api/members/import", { file: excel });
    expect(r.body.add).toEqual([
      expect.objectContaining({
        row: 2,
        name: "Smith, Jo",
        email: "jo.smith@example.com",
        roles: ["Session lead", "Admin"],
      }),
    ]);
  });

  it("a file with mistakes says which rows and why, and adds nobody", async () => {
    const dana = await w.signedIn("dana@example.com");
    const bad = [
      "name,email,position,rating,roles",
      "Ann Ok,ann@example.com,F,50,",
      "Bob Bad,bob@example.com,Striker,50,",
      "Cat Copy,ANN@example.com,F,500,Wizard",
    ].join("\n");
    const check = await dana.call("POST", "/api/members/import", { file: bad });
    expect(check.body.problems).toEqual([
      { row: 3, name: "Bob Bad", why: "Position should be F, D or G" },
      { row: 4, name: "Cat Copy", why: "Rating should be a whole number from 0 to 100" },
      { row: 4, name: "Cat Copy", why: "No role called Wizard" },
      { row: 4, name: "Cat Copy", why: "That email is on row 2 too" },
    ]);
    const r = await dana.call("POST", "/api/members/import", { file: bad, apply: true });
    expect(r.status).toBe(400);
    expect((await members(dana)).map((m) => m.name)).not.toContain("Ann Ok");
  });

  it("a file without a name column is refused", async () => {
    const dana = await w.signedIn("dana@example.com");
    const r = await dana.call("POST", "/api/members/import", { file: "email,position\na@b.com,F" });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/name/);
  });

  it("it's on the record", async () => {
    const dana = await w.signedIn("dana@example.com");
    await dana.call("POST", "/api/members/import", { file: CSV, apply: true });
    const log = (await dana.call("GET", "/api/audit")).body.entries as { action: string }[];
    expect(log.map((e) => e.action)).toContain("members.imported");
  });

  it("only someone who manages members can import", async () => {
    const reg = await w.signedIn("reg@example.com");
    expect((await reg.call("POST", "/api/members/import", { file: CSV })).status).toBe(403);
    expect((await reg.call("POST", "/api/members/import", { file: CSV, apply: true })).status).toBe(403);
  });
});
