// The team app's schedule model (ADR 0030). These are the shapes the D1 tables will have; the demo keeps them in
// memory. Training repeats (series → sessions); tournaments are scheduled one by one under a type; anything else
// is a one-off event. The calendar is all three together.
import type { IconName } from "../app/shell/icons";
import type { DatedFee } from "../lib/dues";
import type { Weekday } from "../lib/recurrence";

/** The colours an admin can give a training or tournament, so each is easy to spot (app.css --tone-*). */
export const TONES = ["red", "blue", "green", "amber", "violet", "teal"] as const;
export type Tone = (typeof TONES)[number];

/** Icons an admin can pick for a training or a tournament. */
export const SCHEDULE_ICONS = ["stick", "skate", "whistle", "puck", "swords", "trophy", "medal", "flag"] as const;
export type ScheduleIcon = (typeof SCHEDULE_ICONS)[number] & IconName;

/** Who's in and who's waiting. In D1 this is the attendance / tournament_entries rows. */
export interface Entries {
  going: number[];
  waitlist: number[];
  /** Who said they're out. Not answering isn't out: someone in none of the lists hasn't said yet. */
  out?: number[];
}

/** A repeating training, e.g. Friday Training. Sessions inherit everything they don't override. */
export interface TrainingSeries {
  id: number;
  slug: string;
  name: string;
  /** The phone tab label when it's the only training, e.g. "Friday". */
  shortName: string;
  icon: ScheduleIcon;
  tone: Tone;
  repeatEvery: number;
  weekdays: Weekday[];
  startsOn: string;
  endsOn: string | null;
  startTime: string;
  endTime: string;
  venue: string;
  /** Places for skaters; null: no limit. */
  capacity: number | null;
  /** Places for goalies, counted apart from the skaters; null: no limit. */
  goalieCapacity?: number | null;
  /** Listed on the public website calendar. */
  public: boolean;
  active: boolean;
  /** The fee per session, going forward from each date (ADR 0032). */
  fees: DatedFee[];
}

/** One night of a series. Null fields follow the series. */
export interface TrainingSession extends Entries {
  id: number;
  seriesId: number;
  heldOn: string;
  movedFrom?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  venue?: string | null;
  capacity?: number | null;
  note?: string | null;
  cancelledAt?: string | null;
  /** The fee for this session: written when the register closes, or an admin's override. */
  feePence?: number | null;
  /** Who came, once the register is closed. */
  attended?: number[];
  /** From the register on the night: who came without signing up (they're added to `going`), and who signed up
   * but didn't come (they stay in `going`). Browser-only until attendance is stored (T2). */
  walkIns?: number[];
  noShows?: number[];
  registerClosedAt?: string | null;
}

/** A kind of tournament the club hosts, e.g. The Cougars Kumite: the format and rules every edition shares. */
export interface TournamentType {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  icon: ScheduleIcon;
  tone: Tone;
  format: "round_robin";
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  gameMinutes: number;
  /** Captains draft the teams (otherwise the team generator makes them). */
  draft: boolean;
  active: boolean;
  /** Copied onto each new edition, where it can be changed. */
  defaultFeePence: number;
}

export type TournamentStatus = "planned" | "open" | "live" | "finished";

/** One edition, scheduled on its own: a name, a location, a date. */
export interface Tournament extends Entries {
  id: number;
  typeId: number;
  name: string;
  location: string;
  heldOn: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  status: TournamentStatus;
  champions?: string | null;
  feePence: number;
  /** False: "Date TBC". The date still decides where it sorts. */
  dateConfirmed: boolean;
}

/** Anything else on the calendar: a social, a kit day. */
export interface OneOff extends Entries {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  signup: boolean;
  capacity?: number | null;
}

/** What the calendar and the In/Out card show, whatever the source. `entries` is the source's own list. */
export interface Bookable {
  key: string;
  kind: "training" | "tournament" | "social";
  /** The calendar filter it belongs to: "series:1", "type:1", "social". */
  filter: string;
  icon: IconName;
  tone: Tone;
  title: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  signup: boolean;
  capacity?: number | null;
  cancelled?: boolean;
  /** The date isn't confirmed: shown as "TBC", sorted by the date it has. */
  dateTbc?: boolean;
  href?: string;
  entries: Entries;
}
