// Reading the schedule: sessions resolved against their series, the next session or tournament, and the
// calendar as one list. Everything here reads `db`, so pages that use it update when an admin edits a series.
import { formatDayDate, londonISO, londonToday } from "../lib/dates";
import type { Bookable, Tournament, TrainingSeries, TrainingSession } from "./model";
import { db } from "./store.svelte";

export const seriesById = (id: number) => db.series.find((s) => s.id === id);
export const typeById = (id: number) => db.tournamentTypes.find((t) => t.id === id);

/** When a tournament is, for a line of text: "Sat 12 June · 11:00–16:00", or "Date TBC" until it's confirmed. */
export const whenOf = (t: Tournament) =>
  t.dateConfirmed ? `${formatDayDate(londonISO(t.heldOn, t.startTime))} · ${t.startTime}–${t.endTime}` : "Date TBC";

/** A session with the series filled in where it doesn't override. */
export function resolve(session: TrainingSession, series = seriesById(session.seriesId)!) {
  return {
    session,
    series,
    heldOn: session.heldOn,
    startTime: session.startTime ?? series.startTime,
    endTime: session.endTime ?? series.endTime,
    venue: session.venue ?? series.venue,
    capacity: session.capacity ?? series.capacity,
    cancelled: Boolean(session.cancelledAt),
  };
}

export function sessionBookable(session: TrainingSession): Bookable {
  const r = resolve(session);
  return {
    key: `session:${session.id}`,
    kind: "training",
    filter: `series:${r.series.id}`,
    icon: r.series.icon,
    tone: r.series.tone,
    title: r.series.name,
    startsAt: londonISO(r.heldOn, r.startTime),
    endsAt: londonISO(r.heldOn, r.endTime),
    venue: r.venue,
    signup: !r.cancelled,
    capacity: r.capacity,
    cancelled: r.cancelled,
    href: `/training/${r.series.slug}`,
    entries: session,
  };
}

export function tournamentBookable(t: Tournament): Bookable {
  const type = typeById(t.typeId)!;
  return {
    key: `tournament:${t.id}`,
    kind: "tournament",
    filter: `type:${type.id}`,
    icon: type.icon,
    tone: type.tone,
    title: t.name,
    startsAt: londonISO(t.heldOn, t.startTime),
    endsAt: londonISO(t.heldOn, t.endTime),
    venue: t.location,
    signup: t.status === "open",
    capacity: t.capacity,
    dateTbc: !t.dateConfirmed,
    href: `/tournaments/${type.slug}`,
    entries: t,
  };
}

/** The next session of a series that isn't cancelled (or the next at all, if they all are). */
export function nextSession(series: TrainingSeries, today = londonToday()): TrainingSession | undefined {
  const future = db.sessions.filter((s) => s.seriesId === series.id && s.heldOn >= today);
  return future.find((s) => !s.cancelledAt) ?? future[0];
}

/** The tournament to show for a type: the live one, else the next, else the most recent. */
export function currentTournament(typeId: number, today = londonToday()): Tournament | undefined {
  const mine = db.tournaments.filter((t) => t.typeId === typeId).sort((a, b) => a.heldOn.localeCompare(b.heldOn));
  return mine.find((t) => t.status === "live") ?? mine.find((t) => t.heldOn >= today) ?? mine.at(-1);
}

/** Everything from today on: training sessions, tournaments and one-offs, in date order. */
export function calendar(today = londonToday()): Bookable[] {
  const start = londonISO(today, "00:00");
  return [
    ...db.sessions.filter((s) => s.heldOn >= today && seriesById(s.seriesId)).map(sessionBookable),
    ...db.tournaments.filter((t) => t.heldOn >= today && typeById(t.typeId)).map(tournamentBookable),
    ...db.oneOffs
      .filter((o) => o.startsAt >= start)
      .map((o): Bookable => ({
        key: `oneoff:${o.id}`,
        kind: "social",
        filter: "social",
        icon: "glass",
        tone: "amber",
        title: o.title,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        venue: o.venue,
        description: o.description,
        signup: o.signup && !o.cancelledAt,
        capacity: o.capacity,
        cancelled: !!o.cancelledAt,
        entries: o,
      })),
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
