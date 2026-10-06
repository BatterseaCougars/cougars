import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "../../../../../shared/testing/d1-sqlite";
import { readFileSync } from "node:fs";
import { AUTO_REPLY_CAPS, autoReplyAllowed, isSpam, markAutoReplied, parseEnquiry, saveEnquiry } from "./enquiries";

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

describe("auto-reply caps", () => {
  let db: ReturnType<typeof createTestD1>;
  beforeEach(() => (db = createTestD1()));
  const now = new Date("2026-10-06T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const enquiry = (email: string) => ({
    name: "Sam",
    email,
    phone: null,
    experience: null,
    message: null,
    source: null,
  });
  const replied = async (email: string, at: Date) => markAutoReplied(db, await saveEnquiry(db, enquiry(email)), at);

  it("records whether Turnstile verified the sender", async () => {
    const id = await saveEnquiry(db, enquiry("a@example.com"), { verified: true });
    expect(db.raw.prepare("SELECT verified FROM enquiries WHERE id = ?").get(id)).toEqual({ verified: 1 });
  });

  it("allows one auto-reply per address per week", async () => {
    expect(await autoReplyAllowed(db, "a@example.com", now)).toBe(true);
    await replied("a@example.com", hoursAgo(24 * 6));
    expect(await autoReplyAllowed(db, "a@example.com", now)).toBe(false);
    expect(await autoReplyAllowed(db, "b@example.com", now)).toBe(true);
    expect(await autoReplyAllowed(db, "a@example.com", new Date(now.getTime() + 2 * 86_400_000))).toBe(true);
  });

  it(`stops after ${AUTO_REPLY_CAPS.perDay} auto-replies in a day, whoever they're to`, async () => {
    for (let i = 0; i < AUTO_REPLY_CAPS.perDay; i++) await replied(`p${i}@example.com`, hoursAgo(1));
    expect(await autoReplyAllowed(db, "new@example.com", now)).toBe(false);
    expect(await autoReplyAllowed(db, "new@example.com", new Date(now.getTime() + 86_400_000))).toBe(true);
  });
});

describe("12-month retention (db/retention/expire-enquiries.sql, run by deploy.yml)", () => {
  const expire = readFileSync(new URL("../../../../../db/retention/expire-enquiries.sql", import.meta.url), "utf8");

  it("deletes enquiries older than 12 months, except from people who joined", () => {
    const db = createTestD1();
    const add = (email: string, monthsAgo: number, status = "new") =>
      db.raw
        .prepare(
          "INSERT INTO enquiries (name, email, status, created_at) VALUES ('Sam', ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?))",
        )
        .run(email, status, `-${monthsAgo} months`);
    add("recent@example.com", 11);
    add("old@example.com", 13);
    add("old-contacted@example.com", 13, "contacted");
    add("old-joined@example.com", 13, "joined");
    db.raw.exec(expire);
    const left = db.raw.prepare("SELECT email FROM enquiries ORDER BY email").all();
    expect(left).toEqual([{ email: "old-joined@example.com" }, { email: "recent@example.com" }]);
  });
});
