import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "../../../../../shared/testing/d1-sqlite";
import { isSpam, parseEnquiry, saveEnquiry } from "./enquiries";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe("parseEnquiry", () => {
  it("accepts a minimal valid submission and normalises it", () => {
    const r = parseEnquiry(form({ name: "  Sam  ", email: "Sam@Example.COM " }));
    expect(r).toEqual({
      ok: true,
      enquiry: { name: "Sam", email: "sam@example.com", phone: null, experience: null, message: null, source: null },
    });
  });

  it("reports every invalid field", () => {
    const r = parseEnquiry(form({ name: "", email: "nope", experience: "pro" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "experience", "name"]);
  });

  it("truncates over-long input", () => {
    const r = parseEnquiry(form({ name: "x".repeat(500), email: "a@b.co", message: "y".repeat(5000) }));
    expect(r.ok && r.enquiry.name.length).toBe(100);
    expect(r.ok && r.enquiry.message!.length).toBe(2000);
  });
});

describe("isSpam", () => {
  it("flags the honeypot", () => {
    expect(isSpam(form({ website: "http://spam" }))).toBe(true);
    expect(isSpam(form({ name: "Sam" }))).toBe(false);
  });
});

describe("saveEnquiry", () => {
  let db: ReturnType<typeof createTestD1>;
  beforeEach(() => (db = createTestD1()));

  it("inserts a row with status new and a timestamp", async () => {
    const id = await saveEnquiry(db, {
      name: "Sam",
      email: "sam@example.com",
      phone: null,
      experience: "never",
      message: "Hi",
      source: "/join/",
    });
    const row = db.raw.prepare("SELECT * FROM enquiries WHERE id = ?").get(id) as Record<string, unknown>;
    expect(row).toMatchObject({ name: "Sam", experience: "never", status: "new", source: "/join/" });
    expect(row.created_at).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
  });
});
