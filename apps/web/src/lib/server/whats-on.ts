// What's on, for the home page: the next few training sessions, tournaments and one-off events from the club
// calendar in D1, which the team app keeps (ADR 0042). Read live on the Worker, so a change in the app shows on the
// next page load. Only what's marked public; cancelled ones stay listed, marked, so nobody turns up to nothing.
import { all } from "../../../../../shared/d1";
import { londonDay, londonISO } from "../dates";

export interface WhatsOnItem {
  key: string;
  kind: "training" | "tournament" | "event";
  /** The series ("Friday Training"), the tournament's own name, or the event's title. */
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string;
  description: string;
  cancelled: boolean;
  /** A tournament whose date isn't fixed: its date only decides where it sorts. */
  dateTbc: boolean;
}

export const LIMITS = { trainings: 3, tournaments: 3, events: 4 };

/** Upcoming public items, soonest first: at most a few of each kind. */
export async function whatsOn(db: D1Database, now = new Date()): Promise<WhatsOnItem[]> {
  const today = londonDay(now.toISOString());
  const [trainings, tournaments, events] = await Promise.all([
    all<{
      id: number;
      name: string;
      heldOn: string;
      startTime: string;
      endTime: string;
      venue: string;
      note: string | null;
      cancelledAt: string | null;
    }>(
      db,
      // A session's own time and venue, where it differs from its series
      `SELECT s.id, r.name, s.held_on heldOn, COALESCE(s.start_time, r.start_time) startTime,
              COALESCE(s.end_time, r.end_time) endTime, COALESCE(s.venue, r.venue) venue, s.note,
              s.cancelled_at cancelledAt
       FROM training_sessions s JOIN training_series r ON r.id = s.series_id
       WHERE r.public = 1 AND s.held_on >= ? ORDER BY s.held_on, s.id LIMIT ?`,
      [today, LIMITS.trainings],
    ),
    all<{
      id: number;
      name: string;
      location: string;
      heldOn: string;
      startTime: string;
      endTime: string;
      dateConfirmed: number;
    }>(
      db,
      `SELECT id, name, location, held_on heldOn, start_time startTime, end_time endTime,
              date_confirmed dateConfirmed
       FROM tournaments WHERE public = 1 AND status != 'finished' AND held_on >= ? ORDER BY held_on LIMIT ?`,
      [today, LIMITS.tournaments],
    ),
    all<{
      id: number;
      title: string;
      startsAt: string;
      endsAt: string;
      venue: string;
      description: string;
      cancelledAt: string | null;
    }>(
      db,
      `SELECT id, title, starts_at startsAt, ends_at endsAt, venue, description, cancelled_at cancelledAt
       FROM club_events WHERE public = 1 AND ends_at >= ? ORDER BY starts_at LIMIT ?`,
      [now.toISOString(), LIMITS.events],
    ),
  ]);

  const items: WhatsOnItem[] = [
    ...trainings.map((s) => ({
      key: `training:${s.id}`,
      kind: "training" as const,
      title: s.name,
      startsAt: londonISO(s.heldOn, s.startTime),
      endsAt: londonISO(s.heldOn, s.endTime),
      venue: s.venue,
      description: s.note ?? "",
      cancelled: !!s.cancelledAt,
      dateTbc: false,
    })),
    ...tournaments.map((t) => ({
      key: `tournament:${t.id}`,
      kind: "tournament" as const,
      title: t.name,
      startsAt: londonISO(t.heldOn, t.startTime),
      endsAt: londonISO(t.heldOn, t.endTime),
      venue: t.location,
      description: "",
      cancelled: false,
      dateTbc: !t.dateConfirmed,
    })),
    ...events.map((e) => ({
      key: `event:${e.id}`,
      kind: "event" as const,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      venue: e.venue,
      description: e.description,
      cancelled: !!e.cancelledAt,
      dateTbc: false,
    })),
  ];
  return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
