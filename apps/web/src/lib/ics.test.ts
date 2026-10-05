import { describe, expect, it } from "vitest";
import { toIcs } from "./ics";

describe("toIcs", () => {
  it("produces a valid single-event calendar with escaped text", () => {
    const ics = toIcs(
      { uid: "kumite@cougars", title: "Kumite; Q4, 2026", startsAt: "2026-12-05T10:00:00Z", location: "Battersea" },
      "2026-10-05T00:00:00Z",
    );
    expect(ics).toContain("DTSTART:20261205T100000Z");
    expect(ics).toContain("DTEND:20261205T120000Z"); // default 2h
    expect(ics).toContain("SUMMARY:Kumite\\; Q4\\, 2026");
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
