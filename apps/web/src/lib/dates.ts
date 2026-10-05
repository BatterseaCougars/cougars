// The club is in London: always format in Europe/London, whatever the build
// machine's timezone is.
const TZ = "Europe/London";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts });

const dayDate = fmt({ weekday: "short", day: "numeric", month: "short", year: "numeric" });
const longDate = fmt({ day: "numeric", month: "long", year: "numeric" });
const time = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const parts = fmt({ day: "numeric", month: "short" });
// en-CA formats dates as YYYY-MM-DD
const isoDay = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export const formatDate = (iso: string) => longDate.format(new Date(iso));
/** "Fri 4 Dec 2026" (Intl puts a comma after the weekday; we drop it). */
export const formatDayDate = (iso: string) =>
  dayDate
    .formatToParts(new Date(iso))
    .filter((p) => p.type !== "literal")
    .map((p) => p.value)
    .join(" ");
export const formatTime = (iso: string) => time.format(new Date(iso));

/** { day: "14", month: "Nov" } for calendar-style date badges. */
export function dateBadge(iso: string) {
  const p = parts.formatToParts(new Date(iso));
  return { day: p.find((x) => x.type === "day")!.value, month: p.find((x) => x.type === "month")!.value };
}

export function formatRange(startIso: string, endIso?: string | null) {
  const start = `${formatDayDate(startIso)} · ${formatTime(startIso)}`;
  if (!endIso) return start;
  const sameDay = formatDayDate(startIso) === formatDayDate(endIso);
  return sameDay ? `${start}–${formatTime(endIso)}` : `${start} – ${formatDayDate(endIso)} · ${formatTime(endIso)}`;
}

/** "2026-10-02": the calendar day in London, like a Sanity `date` field. */
export const londonDay = (iso: string) => isoDay.format(new Date(iso));
