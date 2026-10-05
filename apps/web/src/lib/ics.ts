// Minimal RFC 5545 single-event calendar file, for "Add to calendar".

export interface IcsEvent {
  uid: string;
  title: string;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  description?: string | null;
  url?: string;
}

const stamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const escape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Fold lines to 75 octets as the spec requires (approximated by chars). */
const fold = (line: string) => line.match(/.{1,74}/g)!.join("\r\n ");

export function toIcs(e: IcsEvent, now = new Date().toISOString()): string {
  const end = e.endsAt ?? new Date(new Date(e.startsAt).getTime() + 2 * 3600_000).toISOString();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Battersea Cougars//Website//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(e.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(e.title)}`,
    e.location && `LOCATION:${escape(e.location)}`,
    e.description && `DESCRIPTION:${escape(e.description)}`,
    e.url && `URL:${e.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean) as string[];
  return lines.map(fold).join("\r\n") + "\r\n";
}
