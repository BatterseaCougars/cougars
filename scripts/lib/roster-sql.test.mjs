import { describe, expect, it } from "vitest";
import { createTestD1 } from "../../shared/testing/d1-sqlite";
import { ROSTER_SQL } from "./roster-sql.mjs";

describe("the website roster's record", () => {
  it("counts sessions and tournaments each Cougar played, this year and in all", () => {
    const db = createTestD1().raw;
    const member = db.prepare(
      "INSERT INTO members (name, cougar, status, joined_on, created_at) VALUES (?, ?, ?, '2025-01-01', '2025-01-01')",
    );
    const sam = Number(member.run("Sam Jones", 1, "active").lastInsertRowid);
    member.run("Fri Day", 0, "active");
    member.run("Old Timer", 1, "inactive");
    const friday = db.prepare("SELECT id FROM training_series WHERE slug = 'friday'").get().id;
    const session = db.prepare("INSERT INTO training_sessions (series_id, held_on, cancelled_at) VALUES (?, ?, ?)");
    const year = new Date().getFullYear();
    const lastYear = Number(session.run(friday, `${year - 1}-06-06`, null).lastInsertRowid);
    const thisYear = Number(session.run(friday, `${year}-01-10`, null).lastInsertRowid);
    const noShow = Number(session.run(friday, `${year}-01-17`, null).lastInsertRowid);
    const cancelled = Number(session.run(friday, `${year}-01-24`, `${year}-01-20T09:00:00Z`).lastInsertRowid);
    const out = Number(session.run(friday, `${year}-01-31`, null).lastInsertRowid);
    const answer = db.prepare(
      "INSERT INTO attendance (session_id, member_id, signup, signed_up_at, attended) VALUES (?, ?, ?, '2025-01-01', ?)",
    );
    answer.run(lastYear, sam, "in", 1);
    answer.run(thisYear, sam, "in", null); // signed up, register not taken: counts
    answer.run(noShow, sam, "in", 0);
    answer.run(cancelled, sam, "in", null);
    answer.run(out, sam, "out", null);
    const kumite = db.prepare("SELECT id FROM tournament_types WHERE slug = 'kumite'").get().id;
    const t = db
      .prepare(
        "INSERT INTO tournaments (type_id, name, held_on, start_time, end_time) VALUES (?, ?, ?, '11:00', '16:00')",
      )
      .run(kumite, "Spring Kumite", `${year - 1}-04-01`).lastInsertRowid;
    db.prepare(
      "INSERT INTO tournament_entries (tournament_id, member_id, signup, signed_up_at, attended) VALUES (?, ?, 'in', '2025-01-01', 1)",
    ).run(t, sam);

    expect(db.prepare(ROSTER_SQL).all()).toEqual([
      expect.objectContaining({ name: "Sam Jones", sessions: 2, season: 1, tournaments: 1 }),
    ]);
  });
});
