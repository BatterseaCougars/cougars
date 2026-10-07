import { describe, expect, it } from "vitest";
import { createTestD1 } from "../../../../../shared/testing/d1-sqlite";
import { memberId, publicName, toPlayer } from "../roster";
import { livePlayer } from "./players";

describe("the roster on the website", () => {
  it("shows a first name and initial, never a full name", () => {
    expect(publicName("Adrian Kowalski")).toBe("Adrian K.");
    expect(publicName("  Mary  de la Cruz ")).toBe("Mary C.");
    expect(publicName("Altai")).toBe("Altai");
  });

  it("turns a member into a card: position spelled out, bio as the quote", () => {
    const p = toPlayer({ id: 7, name: "Dana Smith", position: "G", bio: " Stops pucks. ", cougar: 1 });
    expect(p).toEqual({ _id: "member-7", name: "Dana S.", position: "Goalie", quote: "Stops pucks." });
    expect(memberId(p)).toBe(7);
    expect(memberId({ _id: "player-abc", name: "Sample" })).toBeNull();
  });

  it("gives a flipped card the latest details, for active members only", async () => {
    const db = createTestD1();
    const add = db.raw.prepare(
      "INSERT INTO members (name, position, bio, status, joined_on, created_at) VALUES (?, ?, ?, ?, '2026-01-01', '2026-01-01')",
    );
    const active = Number(add.run("Sam Jones", "D", "Hits hard.", "active").lastInsertRowid);
    const gone = Number(add.run("Old Timer", "F", "", "inactive").lastInsertRowid);
    expect(await livePlayer(db, active)).toMatchObject({ name: "Sam J.", position: "Defence", quote: "Hits hard." });
    expect(await livePlayer(db, gone)).toBeNull();
    expect(await livePlayer(db, 9999)).toBeNull();
  });
});
