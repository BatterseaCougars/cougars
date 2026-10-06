// Training series → sessions (the Gwenda ops pattern, simplified). A series holds a rule: every N weeks on some
// weekdays, from a first date to an optional last one. Each session is its own row, made ahead of time, so it can
// be cancelled, moved or changed on its own. Pure date arithmetic on "YYYY-MM-DD" strings; no time zones here.

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface Rule {
  /** 1 = every week, 2 = every other week ... */
  repeatEvery: number;
  weekdays: Weekday[];
  /** The first session. */
  startsOn: string;
  /** The last session, or null for an ongoing series (sessions are made a rolling window ahead). */
  endsOn: string | null;
}

/** How far ahead an ongoing series has its sessions made. Gwenda publishes 12 weeks; we do the same. */
export const HORIZON_WEEKS = 12;

const DAY = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => toDate(toMs(d) + n * DAY);
export const weekdayOf = (d: string): Weekday => WEEKDAYS[(new Date(toMs(d)).getUTCDay() + 6) % 7];
/** Monday of the week a date falls in. */
const weekStart = (d: string) => addDays(d, -WEEKDAYS.indexOf(weekdayOf(d)));

/** Every date the rule makes between `from` and `to`, inclusive. */
export function ruleDates(rule: Rule, from: string, to: string): string[] {
  const first = from > rule.startsOn ? from : rule.startsOn;
  const last = rule.endsOn && rule.endsOn < to ? rule.endsOn : to;
  const origin = toMs(weekStart(rule.startsOn));
  const out: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const weeks = Math.round((toMs(weekStart(d)) - origin) / (7 * DAY));
    if (weeks % rule.repeatEvery === 0 && rule.weekdays.includes(weekdayOf(d))) out.push(d);
  }
  return out;
}

export interface SessionDate {
  heldOn: string;
  /** Set when a session was moved: the rule's original date, which must not be made again. */
  movedFrom?: string | null;
}

/**
 * The dates still to make for a series: what the rule gives from today to the horizon (or its last date), minus
 * dates that already have a session, including cancelled ones and the original dates of moved ones.
 */
export function datesToMake(
  rule: Rule,
  existing: SessionDate[],
  today: string,
  to = addDays(today, HORIZON_WEEKS * 7),
): string[] {
  const taken = new Set(existing.flatMap((s) => [s.heldOn, s.movedFrom ?? ""]));
  return ruleDates(rule, today, to).filter((d) => !taken.has(d));
}

/** "Every week on Fri", "Every 2 weeks on Tue and Thu". */
export function describeRule(rule: Rule): string {
  const names: Record<Weekday, string> = {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  };
  const days = WEEKDAYS.filter((d) => rule.weekdays.includes(d)).map((d) => names[d]);
  const list = days.length > 1 ? `${days.slice(0, -1).join(", ")} and ${days.at(-1)}` : (days[0] ?? "no day");
  const every = rule.repeatEvery === 1 ? "Every week" : `Every ${rule.repeatEvery} weeks`;
  return `${every} on ${list}`;
}
