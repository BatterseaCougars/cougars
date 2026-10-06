// Europe/London formatting. A copy of the website's helpers until dates.ts moves to shared/ (team-app T2);
// projects don't import each other's files (ADR 0021).
const TZ = "Europe/London";
const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts });

const dayDate = fmt({ weekday: "short", day: "numeric", month: "short" });
const time = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const parts = fmt({ day: "numeric", month: "short", weekday: "short" });

/** "Fri 9 Oct" */
export const formatDayDate = (iso: string) =>
  dayDate
    .formatToParts(new Date(iso))
    .filter((p) => p.type !== "literal")
    .map((p) => p.value)
    .join(" ");
export const formatTime = (iso: string) => time.format(new Date(iso));

/** { weekday: "Fri", day: "9", month: "Oct" } for date badges. */
export function dateBadge(iso: string) {
  const p = parts.formatToParts(new Date(iso));
  const get = (type: string) => p.find((x) => x.type === type)!.value;
  return { weekday: get("weekday"), day: get("day"), month: get("month") };
}

export const pounds = (pence: number) =>
  (pence / 100).toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0 });
