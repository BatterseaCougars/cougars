// The schedule (ADR 0030): training series and their sessions, tournament types and editions, one-off events.
// Sessions are rows, made 12 weeks ahead from each active series' rule, so each can be cancelled on its own.
import { all, first, run, type Param } from "../../../shared/d1";
import { SCHEDULE_ICONS, TONES } from "../src/demo/model";
import { WEEKDAYS, datesToMake, type Weekday } from "../src/lib/recurrence";
import { HttpError, bool, date, int, oneOf, text, time } from "./http";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "item";

async function freeSlug(db: D1Database, table: string, base: string, id = 0) {
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (slug !== "new" && !(await first(db, `SELECT 1 FROM ${table} WHERE slug = ? AND id != ?`, [slug, id])))
      return slug;
  }
}

// ─── Training ───

interface SeriesRow {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  icon: string;
  tone: string;
  repeat_every: number;
  weekdays: string;
  starts_on: string;
  ends_on: string | null;
  start_time: string;
  end_time: string;
  venue: string;
  capacity: number | null;
  goalie_capacity: number | null;
  public: number;
  active: number;
}

const seriesJson = (s: SeriesRow) => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  shortName: s.short_name,
  icon: s.icon,
  tone: s.tone,
  repeatEvery: s.repeat_every,
  weekdays: s.weekdays.split(",").filter(Boolean) as Weekday[],
  startsOn: s.starts_on,
  endsOn: s.ends_on,
  startTime: s.start_time,
  endTime: s.end_time,
  venue: s.venue,
  capacity: s.capacity,
  goalieCapacity: s.goalie_capacity,
  public: Boolean(s.public),
  active: Boolean(s.active),
  // Fees per session come with dues (T4)
  fees: [] as { pence: number; from: string }[],
});

export async function listSeries(db: D1Database) {
  return (await all<SeriesRow>(db, "SELECT * FROM training_series ORDER BY id")).map(seriesJson);
}

/** Make each active series' sessions up to the horizon. Dates already made (even cancelled or moved) are skipped. */
export async function ensureSessions(db: D1Database, today: string) {
  const series = await all<SeriesRow>(db, "SELECT * FROM training_series WHERE active = 1");
  for (const s of series) {
    const existing = await all<{ heldOn: string; movedFrom: string | null }>(
      db,
      "SELECT held_on heldOn, moved_from movedFrom FROM training_sessions WHERE series_id = ?",
      [s.id],
    );
    const rule = {
      repeatEvery: s.repeat_every,
      weekdays: s.weekdays.split(",") as Weekday[],
      startsOn: s.starts_on,
      endsOn: s.ends_on,
    };
    for (const d of datesToMake(rule, existing, today))
      await run(db, "INSERT OR IGNORE INTO training_sessions (series_id, held_on) VALUES (?, ?)", [s.id, d]);
  }
}

export async function listSessions(db: D1Database, from: string) {
  return all<{
    id: number;
    seriesId: number;
    heldOn: string;
    movedFrom: string | null;
    startTime: string | null;
    endTime: string | null;
    venue: string | null;
    capacity: number | null;
    note: string | null;
    cancelledAt: string | null;
    registerClosedAt: string | null;
  }>(
    db,
    `SELECT id, series_id seriesId, held_on heldOn, moved_from movedFrom, start_time startTime, end_time endTime,
            venue, capacity, note, cancelled_at cancelledAt, register_closed_at registerClosedAt
     FROM training_sessions WHERE held_on >= ? ORDER BY held_on, id`,
    [from],
  );
}

function seriesFields(o: Record<string, unknown>) {
  const weekdays = o.weekdays;
  if (!Array.isArray(weekdays) || !weekdays.length || weekdays.some((d) => !WEEKDAYS.includes(d as Weekday)))
    throw new HttpError(400, "weekdays should list at least one day.");
  const startsOn = date(o, "startsOn")!;
  const endsOn = date(o, "endsOn", { nullable: true });
  if (endsOn && endsOn < startsOn) throw new HttpError(400, "The last session can't be before the first.");
  return {
    name: text(o, "name", { max: 60 }),
    shortName: text(o, "shortName", { max: 12 }),
    icon: oneOf(o, "icon", SCHEDULE_ICONS),
    tone: oneOf(o, "tone", TONES),
    repeatEvery: int(o, "repeatEvery", { min: 1, max: 8 })!,
    weekdays: WEEKDAYS.filter((d) => weekdays.includes(d)).join(","),
    startsOn,
    endsOn,
    startTime: time(o, "startTime"),
    endTime: time(o, "endTime"),
    venue: text(o, "venue", { optional: true }),
    capacity: int(o, "capacity", { min: 1, max: 500, nullable: true }),
    goalieCapacity: int(o, "goalieCapacity", { min: 0, max: 50, nullable: true }),
    public: bool(o, "public"),
    active: bool(o, "active"),
  };
}

const seriesParams = (f: ReturnType<typeof seriesFields>): Param[] => [
  f.name,
  f.shortName,
  f.icon,
  f.tone,
  f.repeatEvery,
  f.weekdays,
  f.startsOn,
  f.endsOn,
  f.startTime,
  f.endTime,
  f.venue,
  f.capacity,
  f.goalieCapacity,
  f.public ? 1 : 0,
  f.active ? 1 : 0,
];

export async function createSeries(db: D1Database, o: Record<string, unknown>, today: string) {
  const f = seriesFields(o);
  const slug = await freeSlug(db, "training_series", slugify(f.shortName || f.name));
  const res = await run(
    db,
    `INSERT INTO training_series (name, short_name, icon, tone, repeat_every, weekdays, starts_on, ends_on, start_time,
       end_time, venue, capacity, goalie_capacity, public, active, slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...seriesParams(f), slug],
  );
  await ensureSessions(db, today);
  return { id: Number(res.meta.last_row_id), slug };
}

/**
 * Change a series. Future sessions the new rule no longer makes go, unless they were moved or cancelled (an admin
 * touched them) or, once sign-ups exist, someone has signed up. Then the rule fills in what's missing.
 */
export async function updateSeries(db: D1Database, id: number, o: Record<string, unknown>, today: string) {
  if (!(await first(db, "SELECT 1 FROM training_series WHERE id = ?", [id])))
    throw new HttpError(404, "No such training.");
  const f = seriesFields(o);
  await run(
    db,
    `UPDATE training_series SET name = ?, short_name = ?, icon = ?, tone = ?, repeat_every = ?, weekdays = ?,
       starts_on = ?, ends_on = ?, start_time = ?, end_time = ?, venue = ?, capacity = ?, goalie_capacity = ?,
       public = ?, active = ? WHERE id = ?`,
    [...seriesParams(f), id],
  );
  const keep = new Set(
    f.active
      ? datesToMake(
          {
            repeatEvery: f.repeatEvery,
            weekdays: f.weekdays.split(",") as Weekday[],
            startsOn: f.startsOn,
            endsOn: f.endsOn,
          },
          [],
          today,
        )
      : [],
  );
  const future = await all<{ id: number; held_on: string; moved_from: string | null; cancelled_at: string | null }>(
    db,
    "SELECT id, held_on, moved_from, cancelled_at FROM training_sessions WHERE series_id = ? AND held_on >= ?",
    [id, today],
  );
  for (const s of future)
    if (!keep.has(s.held_on) && !s.moved_from && !s.cancelled_at)
      await run(db, "DELETE FROM training_sessions WHERE id = ?", [s.id]);
  await ensureSessions(db, today);
}

/** Cancel one session (Christmas, Easter), or restore it. It stays a row, so whoever signed up can be told. */
export async function setSessionCancelled(db: D1Database, id: number, cancelled: boolean, now: string) {
  const res = await run(db, "UPDATE training_sessions SET cancelled_at = ? WHERE id = ?", [cancelled ? now : null, id]);
  if (!res.meta.changes) throw new HttpError(404, "No such session.");
}

// ─── Tournaments ───

interface TypeRow {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  icon: string;
  tone: string;
  format: string;
  points_win: number;
  points_draw: number;
  points_loss: number;
  game_minutes: number;
  draft: number;
  active: number;
  default_fee_pence: number;
}

export async function listTournamentTypes(db: D1Database) {
  return (await all<TypeRow>(db, "SELECT * FROM tournament_types ORDER BY id")).map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    shortName: t.short_name,
    icon: t.icon,
    tone: t.tone,
    format: t.format,
    pointsWin: t.points_win,
    pointsDraw: t.points_draw,
    pointsLoss: t.points_loss,
    gameMinutes: t.game_minutes,
    draft: Boolean(t.draft),
    active: Boolean(t.active),
    defaultFeePence: t.default_fee_pence,
  }));
}

function typeFields(o: Record<string, unknown>) {
  return [
    text(o, "name", { max: 60 }),
    text(o, "shortName", { max: 12 }),
    oneOf(o, "icon", SCHEDULE_ICONS),
    oneOf(o, "tone", TONES),
    int(o, "pointsWin", { max: 10 }),
    int(o, "pointsDraw", { max: 10 }),
    int(o, "pointsLoss", { max: 10 }),
    int(o, "gameMinutes", { min: 1, max: 90 }),
    bool(o, "draft") ? 1 : 0,
    bool(o, "active") ? 1 : 0,
    int(o, "defaultFeePence", { max: 100_000 }),
  ] as Param[];
}

export async function createTournamentType(db: D1Database, o: Record<string, unknown>) {
  const f = typeFields(o);
  const slug = await freeSlug(db, "tournament_types", slugify(String(f[1] || f[0])));
  const res = await run(
    db,
    `INSERT INTO tournament_types (name, short_name, icon, tone, points_win, points_draw, points_loss, game_minutes,
       draft, active, default_fee_pence, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...f, slug],
  );
  return { id: Number(res.meta.last_row_id), slug };
}

export async function updateTournamentType(db: D1Database, id: number, o: Record<string, unknown>) {
  const res = await run(
    db,
    `UPDATE tournament_types SET name = ?, short_name = ?, icon = ?, tone = ?, points_win = ?, points_draw = ?,
       points_loss = ?, game_minutes = ?, draft = ?, active = ?, default_fee_pence = ? WHERE id = ?`,
    [...typeFields(o), id],
  );
  if (!res.meta.changes) throw new HttpError(404, "No such tournament.");
}

export async function listTournaments(db: D1Database) {
  return (
    await all<{
      id: number;
      typeId: number;
      name: string;
      location: string;
      heldOn: string;
      startTime: string;
      endTime: string;
      capacity: number | null;
      status: string;
      champions: string | null;
      feePence: number;
    }>(
      db,
      `SELECT id, type_id typeId, name, location, held_on heldOn, start_time startTime, end_time endTime, capacity,
              status, champions, fee_pence feePence FROM tournaments ORDER BY held_on`,
    )
  ).map((t) => ({ ...t, going: [] as number[], waitlist: [] as number[] }));
}

function tournamentFields(o: Record<string, unknown>) {
  return [
    text(o, "name", { max: 80 }),
    text(o, "location", { optional: true }),
    date(o, "heldOn"),
    time(o, "startTime"),
    time(o, "endTime"),
    int(o, "capacity", { min: 1, max: 500, nullable: true }),
    oneOf(o, "status", ["planned", "open", "live", "finished"] as const),
    int(o, "feePence", { max: 100_000 }),
  ] as Param[];
}

export async function createTournament(db: D1Database, o: Record<string, unknown>) {
  const typeId = int(o, "typeId", { min: 1 });
  if (!(await first(db, "SELECT 1 FROM tournament_types WHERE id = ?", [typeId])))
    throw new HttpError(400, "No such tournament type.");
  const res = await run(
    db,
    `INSERT INTO tournaments (type_id, name, location, held_on, start_time, end_time, capacity, status, fee_pence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [typeId, ...tournamentFields(o)],
  );
  return { id: Number(res.meta.last_row_id) };
}

export async function updateTournament(db: D1Database, id: number, o: Record<string, unknown>) {
  const res = await run(
    db,
    `UPDATE tournaments SET name = ?, location = ?, held_on = ?, start_time = ?, end_time = ?, capacity = ?,
       status = ?, fee_pence = ? WHERE id = ?`,
    [...tournamentFields(o), id],
  );
  if (!res.meta.changes) throw new HttpError(404, "No such tournament date.");
}

// ─── One-off events ───

export async function listClubEvents(db: D1Database, from: string) {
  return (
    await all<{
      id: number;
      title: string;
      startsAt: string;
      endsAt: string;
      venue: string;
      signup: number;
      capacity: number | null;
    }>(
      db,
      `SELECT id, title, starts_at startsAt, ends_at endsAt, venue, signup_enabled signup, capacity
       FROM club_events WHERE ends_at >= ? ORDER BY starts_at`,
      [from],
    )
  ).map((e) => ({ ...e, signup: Boolean(e.signup), going: [] as number[], waitlist: [] as number[] }));
}

export async function createClubEvent(db: D1Database, o: Record<string, unknown>) {
  const startsAt = text(o, "startsAt", { max: 30 });
  const endsAt = text(o, "endsAt", { max: 30 });
  if (Number.isNaN(Date.parse(startsAt)) || Number.isNaN(Date.parse(endsAt)) || endsAt < startsAt)
    throw new HttpError(400, "The start and end should be times, the end after the start.");
  const res = await run(
    db,
    "INSERT INTO club_events (title, starts_at, ends_at, venue, signup_enabled, capacity) VALUES (?, ?, ?, ?, ?, ?)",
    [
      text(o, "title", { max: 80 }),
      startsAt,
      endsAt,
      text(o, "venue", { optional: true }),
      bool(o, "signup") ? 1 : 0,
      int(o, "capacity", { min: 1, max: 500, nullable: true }),
    ],
  );
  return { id: Number(res.meta.last_row_id) };
}
