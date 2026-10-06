// The roster seed, as it runs on deploy: it adds the club's players once, and never undoes what admins change.
import { describe, expect, it } from "vitest";
import { createTestD1 } from "../../shared/testing/d1-sqlite.ts";
import { parseRoster, rosterSql } from "./roster.mjs";

const ROSTER = JSON.stringify([
  { name: "Pat Example", position: "D", rating: 75, email: "Pat@Example.com", roles: ["Admin"] },
  { name: "Sam O'Neill", position: "F", rating: 40 },
  { name: "Kim Contributor", position: "F", rating: 45, roles: ["Contributor"], cougar: true },
]);

const seed = (raw, text = ROSTER) => raw.exec(rosterSql(parseRoster(text)));
const rolesOf = (raw, name) =>
  raw
    .prepare(
      "SELECT r.name FROM member_roles mr JOIN roles r ON r.id = mr.role_id JOIN members m ON m.id = mr.member_id WHERE m.name = ? ORDER BY r.name",
    )
    .all(name)
    .map((r) => r.name);

describe("seeding the roster", () => {
  it("adds every player as an active member with a payment reference, and everyone is a Member", () => {
    const { raw } = createTestD1();
    seed(raw);
    const rows = raw.prepare("SELECT name, position, rating, status, email, payment_reference FROM members").all();
    expect(rows).toEqual([
      {
        name: "Pat Example",
        position: "D",
        rating: 75,
        status: "active",
        email: "pat@example.com",
        payment_reference: "COU-0001",
      },
      { name: "Sam O'Neill", position: "F", rating: 40, status: "active", email: null, payment_reference: "COU-0002" },
      {
        name: "Kim Contributor",
        position: "F",
        rating: 45,
        status: "active",
        email: null,
        payment_reference: "COU-0003",
      },
    ]);
    expect(rolesOf(raw, "Pat Example")).toEqual(["Admin", "Member"]);
    expect(rolesOf(raw, "Kim Contributor")).toEqual(["Contributor", "Member"]);
    expect(rolesOf(raw, "Sam O'Neill")).toEqual(["Member"]);
  });

  it("can run on every deploy: a second run changes nothing", () => {
    const { raw } = createTestD1();
    seed(raw);
    const before = raw.prepare("SELECT * FROM members").all();
    seed(raw);
    expect(raw.prepare("SELECT * FROM members").all()).toEqual(before);
    expect(raw.prepare("SELECT count(*) n FROM member_roles").get().n).toBe(5);
  });

  it("keeps what an admin changed in the app: rating, position and roles taken away stay changed", () => {
    const { raw } = createTestD1();
    seed(raw);
    raw.exec("UPDATE members SET rating = 90, position = 'G' WHERE name = 'Sam O''Neill'");
    seed(raw, JSON.stringify([{ name: "sam o'neill", position: "F", rating: 40 }]));
    expect(raw.prepare("SELECT rating, position FROM members WHERE name = 'Sam O''Neill'").get()).toEqual({
      rating: 90,
      position: "G",
    });
  });

  it("marks the official team's players as Cougars when it adds them; after that the app decides", () => {
    const { raw } = createTestD1();
    seed(raw);
    const cougars = () =>
      raw
        .prepare("SELECT name FROM members WHERE cougar = 1")
        .all()
        .map((r) => r.name);
    expect(cougars()).toEqual(["Kim Contributor"]);
    // An admin takes Kim off the team and puts Sam on; the next deploy's seed changes neither
    raw.exec("UPDATE members SET cougar = (name = 'Sam O''Neill')");
    seed(raw);
    expect(cougars()).toEqual(["Sam O'Neill"]);
  });

  it("refuses a roster with mistakes in it, saying which row", () => {
    expect(() => parseRoster("not json")).toThrow("valid JSON");
    expect(() => parseRoster(JSON.stringify([{ name: "A", position: "X", rating: 5 }]))).toThrow("Row 1 (A): position");
    expect(() => parseRoster(JSON.stringify([{ name: "A", position: "F", rating: 150 }]))).toThrow("rating");
    expect(() => parseRoster(JSON.stringify([{ name: "A", position: "F", rating: 5, cougar: "yes" }]))).toThrow(
      "cougar should be true or false",
    );
    expect(() =>
      parseRoster(
        JSON.stringify([
          { name: "A", position: "F", rating: 5 },
          { name: "a", position: "D", rating: 5 },
        ]),
      ),
    ).toThrow("Row 2: a is listed twice");
  });
});
