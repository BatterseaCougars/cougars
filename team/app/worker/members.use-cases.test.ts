// An admin adds someone to the club (ADR 0069): their name, email and position, and the app emails them a link to
// itself. They sign in with that email as anyone does. Driven through the real handlers in the fake world (ADR 0031);
// with no Gmail in tests, the email is logged.
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

/** The last email the app wrote. */
function lastEmail() {
  const logged = vi
    .mocked(console.log)
    .mock.calls.map((c) => String(c[0]))
    .filter((l) => l.includes("mail.logged"))
    .at(-1);
  return logged ? (JSON.parse(logged) as { to: string[]; subject: string; text: string }) : null;
}

const NEWBIE = { name: "Nina New", email: "Nina@Example.com ", position: "G" };

describe("an admin adds a member", () => {
  it("they're in the club straight away, and get an email with a link to the app", async () => {
    const dana = await w.signedIn("dana@example.com");
    const r = await dana.call("POST", "/api/members", NEWBIE);
    expect(r.status).toBe(201);
    expect(r.body.emailed).toBe(true);

    const nina = (await dana.call("GET", "/api/bootstrap")).body.members.find(
      (m: { name: string }) => m.name === "Nina New",
    );
    expect(nina).toMatchObject({ id: r.body.id, status: "active", position: "G" });

    const mail = lastEmail()!;
    expect(mail.subject).toMatch(/Cougars/);
    expect(mail.text).toContain("https://team.test/?email=nina%40example.com");
  });

  it("they sign in with that email, as anyone does", async () => {
    const dana = await w.signedIn("dana@example.com");
    await dana.call("POST", "/api/members", NEWBIE);
    const phone = w.browser();
    const { devCode } = await w.ask(phone, "nina@example.com");
    expect((await phone.call("POST", "/api/auth/verify", { code: devCode })).status).toBe(200);
  });

  it("an email already in the club is refused, so nobody ends up twice", async () => {
    const dana = await w.signedIn("dana@example.com");
    const r = await dana.call("POST", "/api/members", { ...NEWBIE, email: "REG@example.com" });
    expect(r.status).toBe(409);
    expect(lastEmail()).toBeNull();
  });

  it("only someone who manages members can add one", async () => {
    const reg = await w.signedIn("reg@example.com");
    expect((await reg.call("POST", "/api/members", NEWBIE)).status).toBe(403);
  });
});
