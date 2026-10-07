// The name rules behind a bank reference (ADR 0038): fiddly enough to pin down on their own.
import { describe, expect, it } from "vitest";
import { createTestD1 } from "./testing/d1-sqlite";
import { REFERENCE_MAX, assignReferenceSql, referenceBase } from "./payment-reference";

describe("a member's bank reference", () => {
  it("is their first name and surname initial, in capitals", () => {
    expect(referenceBase("Adrian Kaczmarczyk")).toBe("COUGARS ADRIAN K");
    expect(referenceBase("Sam O'Neill")).toBe("COUGARS SAM O");
    expect(referenceBase("Mary Jane van der Berg")).toBe("COUGARS MARY B");
    expect(referenceBase("Prince")).toBe("COUGARS PRINCE");
  });

  it("takes only what a bank takes: accents dropped, other letters spelled out", () => {
    expect(referenceBase("Łukasz Żółć")).toBe("COUGARS LUKASZ Z");
    expect(referenceBase("José Müller")).toBe("COUGARS JOSE M");
    expect(referenceBase("  ")).toBe("COUGARS MEMBER");
  });

  it("fits in 18 characters with room for a clash digit", () => {
    const long = referenceBase("Christopher Featherstonehaugh");
    expect(long).toBe("COUGARS CHRISTO F");
    expect((long + "9").length).toBeLessThanOrEqual(REFERENCE_MAX);
  });

  it("gives a second person of the same name and initial the next number, and never changes the first", async () => {
    const db = createTestD1();
    const raw = db.raw;
    const add = async (name: string) => {
      const id = Number(
        raw
          .prepare(`INSERT INTO members (name, joined_on, created_at) VALUES (?, '2026-10-07', '2026-10-07T00:00:00Z')`)
          .run(name).lastInsertRowid,
      );
      const { sql, candidates } = assignReferenceSql(name, "id = ?");
      await db
        .prepare(sql)
        .bind(...candidates, id)
        .run();
      return id;
    };
    const ref = (id: number) =>
      raw.prepare("SELECT payment_reference r FROM members WHERE id = ?").get(id) as { r: string };
    const first = await add("Sam Taylor");
    const second = await add("Sam Thomas");
    expect(ref(first).r).toBe("COUGARS SAM T");
    expect(ref(second).r).toBe("COUGARS SAM T2");

    raw.prepare("UPDATE members SET name = 'Samuel Taylor' WHERE id = ?").run(first);
    const { sql, candidates } = assignReferenceSql("Samuel Taylor", "id = ?");
    await db
      .prepare(sql)
      .bind(...candidates, first)
      .run();
    expect(ref(first).r).toBe("COUGARS SAM T");
  });
});
