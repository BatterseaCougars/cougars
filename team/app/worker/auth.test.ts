// Signing in, as members do it: email, then the code typed in the same browser, then the app for months.
// Driven through the real handler in the fake world (testing.ts, ADR 0031). On a "local" server nothing is emailed,
// so the code comes back in the reply; elsewhere it only goes by email.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "./api";
import { minutes, testWorld } from "./testing";

const ROSTER = [
  { name: "Dana Admin", position: "D", rating: 75, email: "dana@example.com", roles: ["Admin"] },
  { name: "Reg Player", position: "F", rating: 60, email: "reg@example.com" },
];
let w: ReturnType<typeof testWorld>;
let env: Env;

beforeEach(() => {
  w = testWorld(ROSTER);
  env = w.env;
  vi.spyOn(console, "log").mockImplementation(() => {});
});

const verify = (b: ReturnType<typeof w.browser>, code: string, now?: Date) =>
  b.call("POST", "/api/auth/verify", { code }, { now });
/** The last email the app wrote (logged, with no Gmail in tests). */
function lastEmail() {
  const logged = vi
    .mocked(console.log)
    .mock.calls.map((c) => String(c[0]))
    .filter((l) => l.includes("mail.logged"))
    .at(-1)!;
  return JSON.parse(logged) as { to: string[]; subject: string; text: string };
}

describe("signing in with the code", () => {
  it("lets a member in, in the browser they asked in, for months", async () => {
    const phone = w.browser();
    const { devCode } = await w.ask(phone, "Reg@Example.com ");
    expect(devCode).toMatch(/^\d{6}$/);
    expect((await phone.call("GET", "/api/bootstrap")).status).toBe(401);

    expect((await verify(phone, devCode)).status).toBe(200);
    const boot = await phone.call("GET", "/api/bootstrap");
    expect(boot.status).toBe(200);
    expect(boot.body.members.find((m: { id: number }) => m.id === boot.body.me).name).toBe("Reg Player");

    // Five months on, still in; the session moved on as it was used
    expect((await phone.call("GET", "/api/bootstrap", undefined, { now: minutes(150 * 24 * 60) })).status).toBe(200);
    expect((await phone.call("GET", "/api/bootstrap", undefined, { now: minutes(300 * 24 * 60) })).status).toBe(200);
  });

  it("uses cookies no script or sibling site can touch", async () => {
    const phone = w.browser();
    await verify(phone, (await w.ask(phone, "reg@example.com")).devCode);
    expect([...phone.jar.keys()]).toEqual(["__Host-cougars_session"]);
  });

  it("refuses the code in another browser, so a forwarded email signs no one in", async () => {
    const { devCode } = await w.ask(w.browser(), "reg@example.com");
    const r = await verify(w.browser(), devCode);
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/isn't the browser/);
  });

  it("takes either code when they asked twice", async () => {
    const phone = w.browser();
    const first = await w.ask(phone, "reg@example.com");
    await w.ask(phone, "reg@example.com", minutes(1));
    expect((await verify(phone, first.devCode, minutes(2))).status).toBe(200);
  });

  it("allows five wrong codes, then wants a new one", async () => {
    const phone = w.browser();
    const { devCode } = await w.ask(phone, "reg@example.com");
    const wrong = devCode === "000000" ? "111111" : "000000";
    for (let left = 4; left >= 1; left--) expect((await verify(phone, wrong)).body.error).toContain(`${left} tr`);
    expect((await verify(phone, wrong)).body.error).toMatch(/Too many/);
    expect((await verify(phone, devCode)).status).toBe(400);
  });

  it("counts a burst of guesses sent all at once, and lets one right code in once", async () => {
    const attacker = w.browser();
    const { devCode } = await w.ask(attacker, "reg@example.com");
    const wrong = devCode === "000000" ? "111111" : "000000";
    const burst = await Promise.all(Array.from({ length: 20 }, () => verify(attacker, wrong)));
    expect(burst.every((r) => r.status === 400)).toBe(true);
    const attempts = w.db.raw.prepare("SELECT max(attempts) AS n FROM login_challenges").get() as { n: number };
    expect(attempts.n).toBe(5);
    expect((await verify(attacker, devCode)).body.error).toMatch(/Too many/);

    const phone = w.browser();
    const fresh = await w.ask(phone, "reg@example.com", minutes(1));
    const both = await Promise.all([
      verify(phone, fresh.devCode, minutes(2)),
      verify(phone, fresh.devCode, minutes(2)),
    ]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 400]);
    const sessions = w.db.raw.prepare("SELECT count(*) AS n FROM auth_sessions").get() as { n: number };
    expect(sessions.n).toBe(1);
  });

  it("runs out after 15 minutes, and works once", async () => {
    const phone = w.browser();
    const { devCode } = await w.ask(phone, "reg@example.com");
    expect((await verify(phone, devCode, minutes(16))).status).toBe(400);

    const again = await w.ask(phone, "reg@example.com", minutes(17));
    expect((await verify(phone, again.devCode, minutes(18))).status).toBe(200);
    expect((await verify(phone, again.devCode, minutes(19))).status).toBe(400);
  });

  it("gives the same answer for an email that isn't a member's, and sends nothing", async () => {
    const member = await w.ask(w.browser(), "reg@example.com");
    const stranger = await w.ask(w.browser(), "nobody@example.com");
    expect(stranger.message).toBe(member.message);
    expect(stranger.devCode).toBeUndefined();
  });

  it("sends at most five codes an hour and ten a day", async () => {
    const phone = w.browser();
    for (let i = 0; i < 5; i++) expect((await w.ask(phone, "reg@example.com", minutes(i))).devCode).toBeDefined();
    expect((await w.ask(phone, "reg@example.com", minutes(6))).devCode).toBeUndefined();
    for (let i = 0; i < 5; i++)
      expect((await w.ask(phone, "reg@example.com", minutes(61 + i * 61))).devCode).toBeDefined();
    expect((await w.ask(phone, "reg@example.com", minutes(600))).devCode).toBeUndefined();
    expect((await w.ask(phone, "reg@example.com", minutes(24 * 60 + 10))).devCode).toBeDefined();
  });

  it("stops for the day after 20 wrong codes against one member", async () => {
    const attacker = w.browser();
    for (let round = 0; round < 4; round++) {
      const { devCode } = await w.ask(attacker, "reg@example.com", minutes(round * 61));
      const wrong = devCode === "000000" ? "111111" : "000000";
      for (let i = 0; i < 5; i++) await verify(attacker, wrong, minutes(round * 61 + 1));
    }
    // The member themselves can't get a code either, until tomorrow: it's logged for an admin to see
    const phone = w.browser();
    expect((await w.ask(phone, "reg@example.com", minutes(300))).devCode).toBeUndefined();
    const capped = w.db.raw.prepare("SELECT count(*) AS n FROM audit_log WHERE action = 'sign_in.capped'").get();
    expect(capped).toEqual({ n: 1 });
    expect((await w.ask(phone, "reg@example.com", minutes(25 * 60))).devCode).toBeDefined();
  });

  it("emails the code instead of showing it anywhere but a local server", async () => {
    Object.assign(env, { TEAM_ENV: undefined, SITE_ENV: "dev", MAIL_SAFE_TO: "dev@example.com" });
    const phone = w.browser();
    const reply = await w.ask(phone, "reg@example.com");
    expect(reply.devCode).toBeUndefined();
    // No Gmail credentials in tests: the email is logged, sent to the safe address, with the code first and no
    // link (on an iPhone a link opens a browser, never the installed app)
    const email = lastEmail();
    expect(email.to).toEqual(["dev@example.com"]);
    const code = email.subject.match(/(\d{6})$/)![1];
    expect(email.text.startsWith(`Your code is ${code}`)).toBe(true);
    expect(email.text).not.toMatch(/https?:/);
    expect((await verify(phone, code)).status).toBe(200);
  });
});

describe("one member a browser at a time (ADR 0023)", () => {
  it("asking for another account's code ends the first account's codes in that browser", async () => {
    const shared = w.browser();
    const reg = (await w.ask(shared, "reg@example.com")).devCode;
    const dana = (await w.ask(shared, "dana@example.com")).devCode;
    expect((await verify(shared, reg)).status).toBe(400);
    expect((await verify(shared, dana)).status).toBe(200);
    expect((await shared.call("GET", "/api/bootstrap")).body.actions).toContain("manage:all");
  });
});

describe("signing out and being let go", () => {
  it("signs this browser out and no other", async () => {
    const phone = await w.signedIn("reg@example.com");
    const laptop = await w.signedIn("reg@example.com");
    expect((await phone.call("POST", "/api/auth/sign-out")).status).toBe(200);
    expect((await phone.call("GET", "/api/bootstrap")).status).toBe(401);
    expect((await laptop.call("GET", "/api/bootstrap")).status).toBe(200);
  });

  it("shuts out a member an admin makes inactive", async () => {
    const admin = await w.signedIn("dana@example.com");
    const reg = await w.signedIn("reg@example.com");
    const b = (await admin.call("GET", "/api/bootstrap")).body;
    const m = b.members.find((x: { name: string }) => x.name === "Reg Player");
    await admin.call("PUT", `/api/members/${m.id}`, { ...m, status: "inactive", roles: ["Member"] });
    expect((await reg.call("GET", "/api/bootstrap")).status).toBe(401);
  });

  it("answers no one without a session, unless a local server is asked to be the first admin", async () => {
    expect((await w.browser().call("GET", "/api/bootstrap")).status).toBe(401);
    env.TEAM_AUTO_ADMIN = "1";
    expect((await w.browser().call("GET", "/api/bootstrap")).status).toBe(200);
    env.TEAM_ENV = "dev";
    expect((await w.browser().call("GET", "/api/bootstrap")).status).toBe(401);
  });

  it("gives nothing local on a public address, even to a build that says it's local by mistake (ADR 0023)", async () => {
    Object.assign(env, { TEAM_ENV: "local", TEAM_AUTO_ADMIN: "1", SITE_ENV: "dev", MAIL_SAFE_TO: "dev@example.com" });
    const deployed = { host: "https://cougars-team.example.workers.dev" };
    expect((await w.browser().call("GET", "/api/bootstrap", undefined, deployed)).status).toBe(401);
    const reply = await w.browser().call("POST", "/api/auth/start", { email: "reg@example.com" }, deployed);
    expect(reply.status).toBe(200);
    expect(reply.body.devCode).toBeUndefined();
    // Your own machine, by any of its addresses, is still local
    for (const host of [
      "http://localhost:4510",
      "http://192.168.1.20:4510",
      "http://10.0.0.5:4510",
      "http://[::1]:4510",
    ])
      expect((await w.browser().call("GET", "/api/bootstrap", undefined, { host })).status, host).toBe(200);
  });
});

describe("asking to join", () => {
  it("waits for an admin, then signs in like anyone", async () => {
    const newcomer = w.browser();
    const r = await newcomer.call("POST", "/api/auth/request", {
      name: "Nina New",
      email: "nina@example.com",
      phone: "",
      position: "G",
    });
    expect(r.status).toBe(200);
    // Not yet: a pending member gets no code
    expect((await w.ask(newcomer, "nina@example.com")).devCode).toBeUndefined();

    const admin = await w.signedIn("dana@example.com");
    const nina = (await admin.call("GET", "/api/bootstrap")).body.members.find(
      (m: { name: string }) => m.name === "Nina New",
    );
    expect(nina).toMatchObject({ status: "pending", position: "G" });
    await admin.call("PUT", `/api/members/${nina.id}`, { ...nina, status: "active", roles: ["Member"] });

    const { devCode } = await w.ask(newcomer, "nina@example.com");
    expect((await verify(newcomer, devCode)).status).toBe(200);
  });

  it("doesn't say whether an email is already a member's", async () => {
    const ask = (email: string) =>
      w.browser().call("POST", "/api/auth/request", { name: "Someone", email, position: "F" });
    expect((await ask("reg@example.com")).body).toEqual((await ask("new@example.com")).body);
  });
});

describe("an admin giving a member their email", () => {
  it("lets that member sign in with it, and keeps each email to one member", async () => {
    const admin = await w.signedIn("dana@example.com");
    const members = (await admin.call("GET", "/api/bootstrap")).body.members;
    const reg = members.find((m: { name: string }) => m.name === "Reg Player");
    const dana = members.find((m: { name: string }) => m.name === "Dana Admin");
    const set = (id: number, email: string) => admin.call("PUT", `/api/members/${id}/contact`, { email, phone: "" });
    expect((await set(reg.id, "Reg.New@Example.com")).status).toBe(200);
    expect((await set(dana.id, "reg.new@example.com")).status).toBe(409);

    expect((await w.ask(w.browser(), "reg@example.com")).devCode).toBeUndefined();
    const phone = w.browser();
    const { devCode } = await w.ask(phone, "reg.new@example.com");
    expect((await verify(phone, devCode)).status).toBe(200);
  });
});
