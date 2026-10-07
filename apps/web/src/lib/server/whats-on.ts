// What's on, for the home page: the next few training sessions, tournaments and one-off events from the club
// calendar in D1, which the team app keeps (ADR 0042). Read live on the Worker, so a change in the app shows on the
// next page load. Only what's marked public; cancelled ones stay listed, marked, so nobody turns up to nothing.
import { all } from "../../../../../shared/d1";
import { placeOf, type OwnPlace, type Venue } from "../../../../../shared/places";
import { seasonLabel, type Season } from "../../../../../shared/seasons";
import { londonDay, londonISO } from "../dates";
import { cached, type CacheDeps, type CacheOptions } from "./cache";

export interface WhatsOnItem {
  key: string;
  kind: "training" | "tournament" | "event";
  /** The series ("Friday Training"), the tournament's own name, or the event's title. */
  title: string;
  startsAt: string;
  endsAt: string | null;
  /** Where (ADR 0051): the place's name, "" for nowhere yet. */
  venue: string;
  /** Opens the map: the venue's link, the one pasted for it, or a search for its name. */
  mapUrl: string;
  description: string;
  cancelled: boolean;
  /** A tournament whose date isn't fixed: its date only decides where it sorts. */
  dateTbc: boolean;
  /** A tournament that's just a season so far: "Summer 2027", shown instead of a date (ADR 0048). */
  season: string | null;
}

export const LIMITS = { trainings: 3, tournaments: 3, events: 4 };
/** The events page: a few trainings (they're every week), every tournament and event coming up. */
export const ALL_LIMITS = { trainings: 4, tournaments: 50, events: 50 };

/** Fresh for a minute, so a change in the team app shows soon; the last good list for an hour if D1 fails. */
export const CALENDAR_CACHE: CacheOptions = { ttlMs: 60_000, staleMs: 60 * 60_000 };

/** `whatsOn`, cached (ADR 0054): one D1 read a minute, however many people look. */
export const cachedWhatsOn = (db: D1Database, limits = LIMITS, deps?: CacheDeps) =>
  cached(`d1:whats-on:${Object.values(limits).join("-")}`, CALENDAR_CACHE, () => whatsOn(db, new Date(), limits), deps);

/** Upcoming public items, soonest first: at most `limits` of each kind. */
export async function whatsOn(db: D1Database, now = new Date(), limits = LIMITS): Promise<WhatsOnItem[]> {
  const today = londonDay(now.toISOString());
  // Each row's own place (venueId, name, mapUrl) and its series' (seriesVenueId, ...): its own wins (ADR 0051)
  type Places = OwnPlace & { seriesVenueId: number | null; seriesName: string; seriesMapUrl: string };
  const [venues, trainings, tournaments, events] = await Promise.all([
    all<Venue>(db, "SELECT id, name, address, map_url mapUrl, active FROM venues"),
    all<
      Places & {
        id: number;
        title: string;
        heldOn: string;
        startTime: string;
        endTime: string;
        note: string | null;
        cancelledAt: string | null;
      }
    >(
      db,
      // A session's own time and place, where it differs from its series
      `SELECT s.id, r.name title, s.held_on heldOn, COALESCE(s.start_time, r.start_time) startTime,
              COALESCE(s.end_time, r.end_time) endTime, s.venue_id venueId, COALESCE(s.venue, '') name,
              COALESCE(s.map_url, '') mapUrl, r.venue_id seriesVenueId, r.venue seriesName,
              r.map_url seriesMapUrl, s.note, s.cancelled_at cancelledAt
       FROM training_sessions s JOIN training_series r ON r.id = s.series_id
       WHERE r.public = 1 AND s.held_on >= ? ORDER BY s.held_on, s.id LIMIT ?`,
      [today, limits.trainings],
    ),
    all<
      Places & {
        id: number;
        title: string;
        heldOn: string;
        startTime: string;
        endTime: string;
        dateConfirmed: number;
        season: Season | null;
      }
    >(
      db,
      // A date's own place, else its series' (ADR 0046)
      `SELECT t.id, t.name title, t.venue_id venueId, t.location name, t.map_url mapUrl, y.venue_id seriesVenueId,
              COALESCE(y.location, '') seriesName, COALESCE(y.map_url, '') seriesMapUrl, t.held_on heldOn,
              t.start_time startTime, t.end_time endTime, t.date_confirmed dateConfirmed, t.season
       FROM tournaments t LEFT JOIN tournament_types y ON y.id = t.type_id
       WHERE t.public = 1 AND t.status != 'finished' AND t.held_on >= ? ORDER BY t.held_on LIMIT ?`,
      [today, limits.tournaments],
    ),
    all<
      OwnPlace & {
        id: number;
        title: string;
        startsAt: string;
        endsAt: string;
        description: string;
        cancelledAt: string | null;
      }
    >(
      db,
      `SELECT id, title, starts_at startsAt, ends_at endsAt, venue_id venueId, venue name, map_url mapUrl, description,
              cancelled_at cancelledAt
       FROM club_events WHERE public = 1 AND ends_at >= ? ORDER BY starts_at LIMIT ?`,
      [now.toISOString(), limits.events],
    ),
  ]);

  const where = (own: OwnPlace, series?: Places) => {
    const usual = series
      ? placeOf({ venueId: series.seriesVenueId, name: series.seriesName, mapUrl: series.seriesMapUrl }, venues)
      : null;
    const place = placeOf(own, venues, usual);
    return { venue: place?.name ?? "", mapUrl: place?.mapUrl ?? "" };
  };

  const items: WhatsOnItem[] = [
    ...trainings.map((s) => ({
      key: `training:${s.id}`,
      kind: "training" as const,
      title: s.title,
      startsAt: londonISO(s.heldOn, s.startTime),
      endsAt: londonISO(s.heldOn, s.endTime),
      ...where(s, s),
      description: s.note ?? "",
      cancelled: !!s.cancelledAt,
      dateTbc: false,
      season: null,
    })),
    ...tournaments.map((t) => ({
      key: `tournament:${t.id}`,
      kind: "tournament" as const,
      title: t.title,
      startsAt: londonISO(t.heldOn, t.startTime),
      endsAt: londonISO(t.heldOn, t.endTime),
      ...where(t, t),
      description: "",
      cancelled: false,
      dateTbc: !t.dateConfirmed,
      season: t.season ? seasonLabel(t.season, t.heldOn) : null,
    })),
    ...events.map((e) => ({
      key: `event:${e.id}`,
      kind: "event" as const,
      title: e.title,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      ...where(e),
      description: e.description,
      cancelled: !!e.cancelledAt,
      dateTbc: false,
      season: null,
    })),
  ];
  return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
