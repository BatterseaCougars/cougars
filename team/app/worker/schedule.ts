// The schedule (ADR 0030): training series and their sessions, tournament types and editions, one-off events.
// Sessions are rows, made 12 weeks ahead from each active series' rule, so each can be cancelled on its own.
import { all, first, run, type Param } from "../../../shared/d1";
import { cleanMapUrl } from "../../../shared/places";
import { isSeason, seasonEnd, seasonYear, type Season } from "../../../shared/seasons";
import { SCHEDULE_ICONS, TONES } from "../src/demo/model";
import { WEEKDAYS, addDays, datesToMake, type Weekday } from "../src/lib/recurrence";
import { HttpError, bool, date, int, oneOf, text, time } from "./http";
import { listGames } from "./fixtures";
import { syncAll, syncClubEvent, syncSeries, syncTournament, syncTournamentsOf } from "../../../shared/agenda";

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

// ─── Venues (ADR 0051) ───

export async function listVenues(db: D1Database) {
  return (
    await all<{ id: number; name: string; address: string; mapUrl: string; active: number }>(
      db,
      "SELECT id, name, address, map_url mapUrl, active FROM venues ORDER BY name",
    )
  ).map((v) => ({ ...v, active: Boolean(v.active) }));
}

function mapUrlOf(o: Record<string, unknown>) {
  const url = cleanMapUrl(text(o, "mapUrl", { optional: true, max: 500 }));
  if (url === null) throw new HttpError(400, "The map link should be a web link, from Google Maps say.");
  return url;
}

const venueFields = (o: Record<string, unknown>): Param[] => [
  text(o, "name", { max: 80 }),
  text(o, "address", { optional: true, max: 160 }),
  mapUrlOf(o),
  o.active === false ? 0 : 1,
];

export async function createVenue(db: D1Database, o: Record<string, unknown>) {
  const res = await run(db, "INSERT INTO venues (name, address, map_url, active) VALUES (?, ?, ?, ?)", venueFields(o));
  return { id: Number(res.meta.last_row_id) };
}

export async function updateVenue(db: D1Database, id: number, o: Record<string, unknown>) {
  const res = await run(db, "UPDATE venues SET name = ?, address = ?, map_url = ?, active = ? WHERE id = ?", [
    ...venueFields(o),
    id,
  ]);
  if (!res.meta.changes) throw new HttpError(404, "No such venue.");
  // It's the place of everything held there: the agenda's rows say where (ADR 0062)
  await syncAll(db);
}

/**
 * Where something is: `venueId`, a saved venue, or else a name (under `nameKey`) and the map link pasted for it.
 * With a venue, the name and link are cleared: the venue's are what show. As [venue_id, name, map_url].
 */
async function placeFields(db: D1Database, o: Record<string, unknown>, nameKey: string): Promise<Param[]> {
  const venueId = int(o, "venueId", { min: 1, nullable: true });
  if (venueId === null) return [null, text(o, nameKey, { optional: true, max: 120 }), mapUrlOf(o)];
  if (!(await first(db, "SELECT 1 FROM venues WHERE id = ?", [venueId]))) throw new HttpError(400, "No such venue.");
  return [venueId, "", ""];
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
  venue_id: number | null;
  venue: string;
  map_url: string;
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
  venueId: s.venue_id,
  venue: s.venue,
  mapUrl: s.map_url,
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
    const made = datesToMake(rule, existing, today);
    for (const d of made)
      await run(db, "INSERT OR IGNORE INTO training_sessions (series_id, held_on) VALUES (?, ?)", [s.id, d]);
    // Only when there are new ones: this runs on every load of the app
    if (made.length) await syncSeries(db, s.id);
  }
}

/**
 * An admin looks further ahead: the next 12 weeks of a training's sessions past the last one made, so a far-off
 * date can be cancelled early. At most two years ahead.
 */
export async function moreSessions(db: D1Database, seriesId: number, today: string) {
  const s = await first<SeriesRow>(db, "SELECT * FROM training_series WHERE id = ?", [seriesId]);
  if (!s) throw new HttpError(404, "No such training.");
  const existing = await all<{ heldOn: string; movedFrom: string | null }>(
    db,
    "SELECT held_on heldOn, moved_from movedFrom FROM training_sessions WHERE series_id = ?",
    [s.id],
  );
  const last = existing.reduce((m, x) => (x.heldOn > m ? x.heldOn : m), today);
  const limit = addDays(today, 2 * 365);
  const to = addDays(last, 12 * 7) < limit ? addDays(last, 12 * 7) : limit;
  const rule = {
    repeatEvery: s.repeat_every,
    weekdays: s.weekdays.split(",") as Weekday[],
    startsOn: s.starts_on,
    endsOn: s.ends_on,
  };
  for (const d of datesToMake(rule, existing, today, to))
    await run(db, "INSERT OR IGNORE INTO training_sessions (series_id, held_on) VALUES (?, ?)", [s.id, d]);
  await syncSeries(db, s.id);
}

export async function listSessions(db: D1Database, from: string) {
  return all<{
    id: number;
    seriesId: number;
    heldOn: string;
    movedFrom: string | null;
    startTime: string | null;
    endTime: string | null;
    venueId: number | null;
    venue: string | null;
    mapUrl: string | null;
    capacity: number | null;
    note: string | null;
    cancelledAt: string | null;
    registerClosedAt: string | null;
  }>(
    db,
    `SELECT id, series_id seriesId, held_on heldOn, moved_from movedFrom, start_time startTime, end_time endTime,
            venue_id venueId, venue, map_url mapUrl, capacity, note, cancelled_at cancelledAt, register_closed_at registerClosedAt
     FROM training_sessions WHERE held_on >= ? ORDER BY held_on, id`,
    [from],
  );
}

async function seriesFields(db: D1Database, o: Record<string, unknown>) {
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
    place: await placeFields(db, o, "venue"),
    capacity: int(o, "capacity", { min: 1, max: 500, nullable: true }),
    goalieCapacity: int(o, "goalieCapacity", { min: 0, max: 50, nullable: true }),
    public: bool(o, "public"),
    active: bool(o, "active"),
  };
}

const seriesParams = (f: Awaited<ReturnType<typeof seriesFields>>): Param[] => [
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
  ...f.place,
  f.capacity,
  f.goalieCapacity,
  f.public ? 1 : 0,
  f.active ? 1 : 0,
];

export async function createSeries(db: D1Database, o: Record<string, unknown>, today: string) {
  const f = await seriesFields(db, o);
  const slug = await freeSlug(db, "training_series", slugify(f.shortName || f.name));
  const res = await run(
    db,
    `INSERT INTO training_series (name, short_name, icon, tone, repeat_every, weekdays, starts_on, ends_on, start_time,
       end_time, venue_id, venue, map_url, capacity, goalie_capacity, public, active, slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...seriesParams(f), slug],
  );
  await ensureSessions(db, today);
  await syncSeries(db, Number(res.meta.last_row_id));
  return { id: Number(res.meta.last_row_id), slug };
}

/**
 * Change a series. Future sessions the new rule no longer makes go, unless they were moved or cancelled (an admin
 * touched them) or, once sign-ups exist, someone has signed up. Then the rule fills in what's missing.
 */
export async function updateSeries(db: D1Database, id: number, o: Record<string, unknown>, today: string) {
  if (!(await first(db, "SELECT 1 FROM training_series WHERE id = ?", [id])))
    throw new HttpError(404, "No such training.");
  const f = await seriesFields(db, o);
  await run(
    db,
    `UPDATE training_series SET name = ?, short_name = ?, icon = ?, tone = ?, repeat_every = ?, weekdays = ?,
       starts_on = ?, ends_on = ?, start_time = ?, end_time = ?, venue_id = ?, venue = ?, map_url = ?, capacity = ?, goalie_capacity = ?,
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
  // A session someone has answered (or that was moved or cancelled) isn't untouched: it stays for them
  const future = await all<{
    id: number;
    held_on: string;
    moved_from: string | null;
    cancelled_at: string | null;
    answered: number;
  }>(
    db,
    `SELECT s.id, s.held_on, s.moved_from, s.cancelled_at,
            EXISTS (SELECT 1 FROM attendance a WHERE a.session_id = s.id) answered
     FROM training_sessions s WHERE s.series_id = ? AND s.held_on >= ?`,
    [id, today],
  );
  for (const s of future)
    if (!keep.has(s.held_on) && !s.moved_from && !s.cancelled_at && !s.answered)
      await run(db, "DELETE FROM training_sessions WHERE id = ?", [s.id]);
  await ensureSessions(db, today);
  await syncSeries(db, id);
}

/** Cancel one session (Christmas, Easter), or restore it. It stays a row, so whoever signed up can be told. */
export async function setSessionCancelled(db: D1Database, id: number, cancelled: boolean, now: string) {
  const res = await run(db, "UPDATE training_sessions SET cancelled_at = ? WHERE id = ?", [cancelled ? now : null, id]);
  if (!res.meta.changes) throw new HttpError(404, "No such session.");
  const s = await first<{ seriesId: number }>(db, "SELECT series_id seriesId FROM training_sessions WHERE id = ?", [
    id,
  ]);
  if (s) await syncSeries(db, s.seriesId);
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
  kind: Kind;
  active: number;
  default_fee_pence: number;
  awards: string;
  playoffs: string;
  venue_id: number | null;
  location: string;
  map_url: string;
}

/** How a tournament makes its teams (ADR 0052): teams enter, or captains draft members. */
export const KINDS = ["teams", "draft"] as const;
type Kind = (typeof KINDS)[number];

/** A tournament type's award (ADR 0044): what it's called and a line on what it's for. */
export interface Award {
  name: string;
  about: string;
}

const parseAwards = (json: string): Award[] => {
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

/** Up to 8 awards, each with a name; empty rows are dropped. */
function awardsOf(o: Record<string, unknown>): string {
  const list = o.awards ?? [];
  if (!Array.isArray(list)) throw new HttpError(400, "awards should be a list.");
  const awards = list
    .map((a: Record<string, unknown>) => ({
      name: text(a, "name", { optional: true, max: 40 }).trim(),
      about: text(a, "about", { optional: true, max: 120 }).trim(),
    }))
    .filter((a) => a.name);
  if (awards.length > 8) throw new HttpError(400, "Up to 8 awards.");
  return JSON.stringify(awards);
}

/** A playoff game by table position (ADR 0061): "Final", 1st v 2nd. */
export interface Playoff {
  name: string;
  home: number;
  away: number;
}

const parsePlayoffs = (json: string): Playoff[] => {
  try {
    const list = JSON.parse(json);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

/** Up to 8 playoff games, each a name and two different table positions (1–16). */
function playoffsOf(o: Record<string, unknown>): string {
  const list = o.playoffs ?? [];
  if (!Array.isArray(list)) throw new HttpError(400, "playoffs should be a list.");
  if (list.length > 8) throw new HttpError(400, "Up to 8 playoff games.");
  const games = list.map((g: Record<string, unknown>) => {
    const game = {
      name: text(g, "name", { max: 40 }).trim(),
      home: int(g, "home", { min: 1, max: 16 }),
      away: int(g, "away", { min: 1, max: 16 }),
    };
    if (!game.name) throw new HttpError(400, "Every playoff game needs a name.");
    if (game.home === game.away) throw new HttpError(400, "A playoff game is between two different places.");
    return game;
  });
  return JSON.stringify(games);
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
    kind: t.kind,
    active: Boolean(t.active),
    defaultFeePence: t.default_fee_pence,
    awards: parseAwards(t.awards),
    playoffs: parsePlayoffs(t.playoffs),
    venueId: t.venue_id,
    location: t.location,
    mapUrl: t.map_url,
  }));
}

async function typeFields(db: D1Database, o: Record<string, unknown>) {
  return [
    text(o, "name", { max: 60 }),
    text(o, "shortName", { max: 12 }),
    oneOf(o, "icon", SCHEDULE_ICONS),
    oneOf(o, "tone", TONES),
    int(o, "pointsWin", { max: 10 }),
    int(o, "pointsDraw", { max: 10 }),
    int(o, "pointsLoss", { max: 10 }),
    int(o, "gameMinutes", { min: 1, max: 90 }),
    oneOf(o, "kind", KINDS),
    bool(o, "active") ? 1 : 0,
    int(o, "defaultFeePence", { max: 100_000 }),
    awardsOf(o),
    ...(await placeFields(db, o, "location")),
    playoffsOf(o),
  ] as Param[];
}

export async function createTournamentType(db: D1Database, o: Record<string, unknown>) {
  const f = await typeFields(db, o);
  const slug = await freeSlug(db, "tournament_types", slugify(String(f[1] || f[0])));
  const res = await run(
    db,
    `INSERT INTO tournament_types (name, short_name, icon, tone, points_win, points_draw, points_loss, game_minutes,
       kind, active, default_fee_pence, awards, venue_id, location, map_url, playoffs, slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [...f, slug],
  );
  return { id: Number(res.meta.last_row_id), slug };
}

export async function updateTournamentType(db: D1Database, id: number, o: Record<string, unknown>) {
  const res = await run(
    db,
    `UPDATE tournament_types SET name = ?, short_name = ?, icon = ?, tone = ?, points_win = ?, points_draw = ?,
       points_loss = ?, game_minutes = ?, kind = ?, active = ?, default_fee_pence = ?, awards = ?, venue_id = ?,
       location = ?, map_url = ?, playoffs = ?
     WHERE id = ?`,
    [...(await typeFields(db, o)), id],
  );
  if (!res.meta.changes) throw new HttpError(404, "No such tournament series.");
  // Its place is its tournaments' fallback
  await syncTournamentsOf(db, id);
}

/**
 * Every tournament date. Its place (`venueId`, `location`, `mapUrl`) is its own; none of them set, its series' is
 * where it really is (ADR 0051), which the app works out. Its teams come in pick order (a draft) or the order they
 * entered, each with its players in order (ADR 0052).
 */
export async function listTournaments(db: D1Database) {
  const [rows, teams, players, games] = await Promise.all([
    all<{
      id: number;
      typeId: number;
      name: string;
      venueId: number | null;
      location: string;
      mapUrl: string;
      heldOn: string;
      startTime: string;
      endTime: string;
      capacity: number | null;
      status: string;
      champions: string | null;
      feePence: number;
      dateConfirmed: number;
      season: Season | null;
      public: number;
      signupClosesOn: string | null;
      draftOn: string | null;
      draftTime: string | null;
      pointsWin: number;
      pointsDraw: number;
      pointsLoss: number;
      gameMinutes: number;
      kind: Kind;
      awards: string;
      playoffs: string;
      draftState: string;
    }>(
      db,
      `SELECT t.id, t.type_id typeId, t.name, t.venue_id venueId, t.location, t.map_url mapUrl, t.held_on heldOn, t.start_time startTime, t.end_time endTime, t.capacity, t.status, t.champions,
              t.fee_pence feePence, t.date_confirmed dateConfirmed, t.season, t.public, t.signup_closes_on signupClosesOn,
              t.draft_on draftOn, t.draft_time draftTime, t.points_win pointsWin, t.points_draw pointsDraw,
              t.points_loss pointsLoss, t.game_minutes gameMinutes, t.kind, t.awards, t.playoffs, t.draft_state draftState
       FROM tournaments t ORDER BY t.held_on`,
    ),
    all<{
      id: number;
      tournamentId: number;
      name: string;
      logo: string | null;
      captainMemberId: number | null;
      captainName: string;
      contact: string;
      pick: number | null;
    }>(
      db,
      `SELECT id, tournament_id tournamentId, name, logo, captain_member_id captainMemberId, captain_name captainName,
              contact, pick
       FROM tournament_teams ORDER BY tournament_id, coalesce(pick, 1000), id`,
    ),
    all<{ teamId: number; memberId: number | null; name: string }>(
      db,
      `SELECT team_id teamId, member_id memberId, name FROM tournament_team_players
       ORDER BY team_id, coalesce(pick_number, position), id`,
    ),
    listGames(db),
  ]);
  return rows.map((t) => ({
    ...t,
    draftState: draftStateOf(
      t,
      teams.some((team) => team.tournamentId === t.id),
    ),
    dateConfirmed: Boolean(t.dateConfirmed),
    public: Boolean(t.public),
    awards: parseAwards(t.awards),
    playoffs: parsePlayoffs(t.playoffs),
    games: games.filter((g) => g.tournamentId === t.id).map(({ tournamentId: _, ...g }) => g),
    teams: teams
      .filter((team) => team.tournamentId === t.id)
      .map(({ tournamentId: _, ...team }) => ({
        ...team,
        players: players.filter((p) => p.teamId === team.id).map(({ teamId: _, ...p }) => p),
      })),
  }));
}

/**
 * Where a captains' draft is (ADR 0060): "none" (not a draft, or no day or captains yet), "scheduled" (a day and
 * captains, not opened), "open" (an admin opened it: captains pick) or "closed" (an admin closed it: teams locked).
 */
export function draftStateOf(t: { kind: string; draftOn: string | null; draftState: string }, hasTeams: boolean) {
  if (t.kind !== "draft") return "none";
  if (t.draftState === "open" || t.draftState === "closed") return t.draftState;
  return t.draftOn && hasTeams ? "scheduled" : "none";
}

async function tournamentFields(db: D1Database, o: Record<string, unknown>) {
  const heldOn = date(o, "heldOn")!;
  // Just a season so far (ADR 0048): its day is the season's last, and it isn't confirmed
  const season = o.season == null || o.season === "" ? null : o.season;
  if (season !== null && !isSeason(season))
    throw new HttpError(400, "season should be spring, summer, autumn or winter.");
  if (season && heldOn !== seasonEnd(season, seasonYear(season, heldOn)))
    throw new HttpError(400, "A season's date is its last day.");
  const signupClosesOn = date(o, "signupClosesOn", { nullable: true });
  if (signupClosesOn && signupClosesOn > heldOn) throw new HttpError(400, "Sign-up can't close after the day.");
  const draftOn = date(o, "draftOn", { nullable: true });
  if (draftOn && draftOn > heldOn) throw new HttpError(400, "The draft has to be before the day.");
  return [
    text(o, "name", { max: 80 }),
    // None set: its series' place
    ...(await placeFields(db, o, "location")),
    heldOn,
    time(o, "startTime"),
    time(o, "endTime"),
    int(o, "capacity", { min: 1, max: 500, nullable: true }),
    oneOf(o, "status", ["planned", "open", "live", "finished"] as const),
    int(o, "feePence", { max: 100_000 }),
    // Unconfirmed: shown as "Date TBC"; the date only decides where it sorts. Confirmed unless said otherwise.
    season || o.dateConfirmed === false ? 0 : 1,
    season,
    // Shown on the website unless said otherwise
    o.public === false ? 0 : 1,
    signupClosesOn,
    draftOn,
    draftOn && o.draftTime ? time(o, "draftTime") : null,
  ] as Param[];
}

/** A team as the app sends it (ADR 0052). */
interface TeamIn {
  /** The team it is, if it's been saved before: teams are changed in place, never remade (ADR 0060). */
  id: number | null;
  name: string;
  logo: string | null;
  captainMemberId: number | null;
  captainName: string;
  contact: string;
  players: { memberId: number | null; name: string }[];
}

const LOGO = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

/**
 * A tournament's teams, in order (a draft's pick order), at most 16 of up to 30 players. A draft's teams each have a
 * member as captain; a team that entered has a name. Nobody plays for two teams. Absent: left as they are.
 */
function teamsOf(o: Record<string, unknown>, kind: Kind): TeamIn[] | null {
  if (o.teams == null) return null;
  if (!Array.isArray(o.teams)) throw new HttpError(400, "teams should be a list.");
  if (o.teams.length > 16) throw new HttpError(400, "Up to 16 teams.");
  const teams = o.teams.map((t: Record<string, unknown>): TeamIn => {
    const logo = t.logo == null || t.logo === "" ? null : t.logo;
    if (logo !== null && (typeof logo !== "string" || logo.length > 200_000 || !LOGO.test(logo)))
      throw new HttpError(400, "A logo should be a small PNG, JPEG or WebP image.");
    const list = t.players ?? [];
    if (!Array.isArray(list) || list.length > 30) throw new HttpError(400, "Up to 30 players a team.");
    const team = {
      id: int(t, "id", { min: 1, nullable: true }),
      name: text(t, "name", { optional: true, max: 40 }).trim(),
      logo,
      captainMemberId: int(t, "captainMemberId", { min: 1, nullable: true }),
      captainName: text(t, "captainName", { optional: true, max: 60 }).trim(),
      contact: text(t, "contact", { optional: true, max: 120 }).trim(),
      players: list
        .map((p: Record<string, unknown>) => ({
          memberId: int(p, "memberId", { min: 1, nullable: true }),
          name: text(p, "name", { optional: true, max: 60 }).trim(),
        }))
        .filter((p) => p.memberId !== null || p.name),
    };
    if (kind === "draft" && team.captainMemberId === null)
      throw new HttpError(400, "In a draft, every team's captain is a member.");
    if (kind === "teams" && !team.name) throw new HttpError(400, "Every team needs a name.");
    return team;
  });
  // A draft's players come from its picks (draft.ts), never from the editor
  if (kind === "draft") for (const t of teams) t.players = [];
  const members = teams.flatMap((t) => [t.captainMemberId, ...t.players.map((p) => p.memberId)]).filter((m) => m);
  if (new Set(members).size !== members.length) throw new HttpError(400, "Someone is on two teams.");
  return teams;
}

/**
 * Save a tournament's teams as the editor sends them (ADR 0060): each one changed in place (by its id, or in a draft
 * by its captain), new ones added, missing ones removed. A draft's picks are never touched here, and once its draft
 * is open its captains and their order are fixed. A draft's captains are in the tournament automatically.
 */
async function setTeams(db: D1Database, id: number, kind: Kind, teams: TeamIn[] | null, now = new Date()) {
  if (!teams) return;
  for (const m of teams.flatMap((t) => [t.captainMemberId, ...t.players.map((p) => p.memberId)]))
    if (m !== null && !(await first(db, "SELECT 1 FROM members WHERE id = ?", [m])))
      throw new HttpError(400, "No such member.");
  const existing = await all<{ id: number; captain: number | null }>(
    db,
    "SELECT id, captain_member_id captain FROM tournament_teams WHERE tournament_id = ? ORDER BY coalesce(pick, 1000), id",
    [id],
  );
  const state = (await first<{ s: string }>(db, "SELECT draft_state s FROM tournaments WHERE id = ?", [id]))?.s;
  if (kind === "draft" && (state === "open" || state === "closed")) {
    const same = teams.length === existing.length && teams.every((t, i) => t.captainMemberId === existing[i].captain);
    if (!same) throw new HttpError(409, "The draft has started: the captains and their order are set.");
  }
  const match = (t: TeamIn) =>
    existing.find((e) => e.id === t.id) ??
    (kind === "draft" ? existing.find((e) => e.captain !== null && e.captain === t.captainMemberId) : undefined);
  const kept = new Set<number>();
  for (const [i, t] of teams.entries()) {
    const pick = kind === "draft" ? i + 1 : null;
    const found = match(t);
    let teamId: number;
    if (found && !kept.has(found.id)) {
      teamId = found.id;
      await run(
        db,
        `UPDATE tournament_teams SET name = ?, logo = ?, captain_member_id = ?, captain_name = ?, contact = ?, pick = ?
         WHERE id = ?`,
        [t.name, t.logo, t.captainMemberId, t.captainName, t.contact, pick, teamId],
      );
    } else {
      const res = await run(
        db,
        `INSERT INTO tournament_teams (tournament_id, name, logo, captain_member_id, captain_name, contact, pick, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, t.name, t.logo, t.captainMemberId, t.captainName, t.contact, pick, now.toISOString()],
      );
      teamId = Number(res.meta.last_row_id);
    }
    kept.add(teamId);
    // A team that entered: its players are the editor's. A draft's come from its picks.
    if (kind === "teams") {
      await run(db, "DELETE FROM tournament_team_players WHERE team_id = ?", [teamId]);
      for (const [position, p] of t.players.entries())
        await run(db, "INSERT INTO tournament_team_players (team_id, member_id, name, position) VALUES (?, ?, ?, ?)", [
          teamId,
          p.memberId,
          p.name,
          position,
        ]);
    }
  }
  for (const e of existing) if (!kept.has(e.id)) await run(db, "DELETE FROM tournament_teams WHERE id = ?", [e.id]);
  // A draft's captains play: they're in, and so never in the pool to pick from
  if (kind === "draft")
    for (const t of teams)
      await run(
        db,
        `INSERT INTO tournament_entries (tournament_id, member_id, signup, signed_up_at) VALUES (?, ?, 'in', ?)
         ON CONFLICT (tournament_id, member_id) DO UPDATE SET signup = 'in'`,
        [id, t.captainMemberId, now.toISOString()],
      );
}

/** Its series, if it has one: a tournament can stand on its own. */
async function seriesOf(db: D1Database, o: Record<string, unknown>) {
  const typeId = int(o, "typeId", { min: 1, nullable: true });
  if (typeId === null) return { typeId, series: null };
  const series = await first<TypeRow>(db, "SELECT * FROM tournament_types WHERE id = ?", [typeId]);
  if (!series) throw new HttpError(400, "No such tournament series.");
  return { typeId, series };
}

/**
 * A tournament's own rules and awards, copied from its series and changed for it if need be (ADR 0049). One left
 * out keeps what it was (on a change), or takes the series' (or, with no series, the usual round robin's).
 */
type Rules = Pick<
  TypeRow,
  "points_win" | "points_draw" | "points_loss" | "game_minutes" | "kind" | "awards" | "playoffs"
>;

function rulesOf(o: Record<string, unknown>, series: Rules | null) {
  const given = (key: string) => o[key] != null;
  return [
    given("pointsWin") ? int(o, "pointsWin", { max: 10 }) : (series?.points_win ?? 3),
    given("pointsDraw") ? int(o, "pointsDraw", { max: 10 }) : (series?.points_draw ?? 1),
    given("pointsLoss") ? int(o, "pointsLoss", { max: 10 }) : (series?.points_loss ?? 0),
    given("gameMinutes") ? int(o, "gameMinutes", { min: 1, max: 90 }) : (series?.game_minutes ?? 12),
    given("kind") ? oneOf(o, "kind", KINDS) : (series?.kind ?? "teams"),
    given("awards") ? awardsOf(o) : (series?.awards ?? "[]"),
    given("playoffs") ? playoffsOf(o) : (series?.playoffs ?? "[]"),
  ] as Param[];
}

export async function createTournament(db: D1Database, o: Record<string, unknown>) {
  const { typeId, series } = await seriesOf(db, o);
  const rules = rulesOf(o, series);
  const fields = [...(await tournamentFields(db, o)), ...rules];
  const kind = rules[4] as Kind;
  const teams = teamsOf(o, kind);
  const res = await run(
    db,
    `INSERT INTO tournaments (type_id, name, venue_id, location, map_url, held_on, start_time, end_time, capacity, status, fee_pence,
       date_confirmed, season, public, signup_closes_on, draft_on, draft_time, points_win, points_draw, points_loss,
       game_minutes, kind, awards, playoffs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [typeId, ...fields],
  );
  const id = Number(res.meta.last_row_id);
  await setTeams(db, id, kind, teams);
  await syncTournament(db, id);
  return { id };
}

export async function updateTournament(db: D1Database, id: number, o: Record<string, unknown>) {
  const { typeId } = await seriesOf(db, o);
  const current = await first<Rules & { draft_state: string }>(
    db,
    `SELECT points_win, points_draw, points_loss, game_minutes, kind, awards, playoffs, draft_state
     FROM tournaments WHERE id = ?`,
    [id],
  );
  if (!current) throw new HttpError(404, "No such tournament.");
  const rules = rulesOf(o, current);
  if (rules[4] !== current.kind && current.draft_state !== "none")
    throw new HttpError(409, "The draft has started: it stays a draft.");
  const fields = [...(await tournamentFields(db, o)), ...rules];
  const kind = rules[4] as Kind;
  const teams = teamsOf(o, kind);
  const res = await run(
    db,
    `UPDATE tournaments SET type_id = ?, name = ?, venue_id = ?, location = ?, map_url = ?, held_on = ?, start_time = ?, end_time = ?, capacity = ?,
       status = ?, fee_pence = ?, date_confirmed = ?, season = ?, public = ?, signup_closes_on = ?, draft_on = ?, draft_time = ?,
       points_win = ?, points_draw = ?, points_loss = ?, game_minutes = ?, kind = ?, awards = ?, playoffs = ?
     WHERE id = ?`,
    [typeId, ...fields, id],
  );
  if (!res.meta.changes) throw new HttpError(404, "No such tournament.");
  await setTeams(db, id, kind, teams);
  await syncTournament(db, id);
}

// ─── One-off events ───

export async function listClubEvents(db: D1Database, from: string) {
  return (
    await all<{
      id: number;
      title: string;
      startsAt: string;
      endsAt: string;
      venueId: number | null;
      venue: string;
      mapUrl: string;
      description: string;
      public: number;
      signup: number;
      capacity: number | null;
      cancelledAt: string | null;
    }>(
      db,
      `SELECT id, title, starts_at startsAt, ends_at endsAt, venue_id venueId, venue, map_url mapUrl, description, public,
              signup_enabled signup,
              capacity, cancelled_at cancelledAt
       FROM club_events WHERE ends_at >= ? ORDER BY starts_at`,
      [from],
    )
  ).map((e) => ({ ...e, public: Boolean(e.public), signup: Boolean(e.signup) }));
}

async function clubEventFields(db: D1Database, o: Record<string, unknown>) {
  const startsAt = text(o, "startsAt", { max: 30 });
  const endsAt = text(o, "endsAt", { max: 30 });
  if (Number.isNaN(Date.parse(startsAt)) || Number.isNaN(Date.parse(endsAt)) || endsAt < startsAt)
    throw new HttpError(400, "The start and end should be times, the end after the start.");
  return [
    text(o, "title", { max: 80 }),
    startsAt,
    endsAt,
    ...(await placeFields(db, o, "venue")),
    text(o, "description", { optional: true, max: 280 }),
    // Shown on the website unless said otherwise
    o.public === false ? 0 : 1,
    bool(o, "signup") ? 1 : 0,
    int(o, "capacity", { min: 1, max: 500, nullable: true }),
  ] as Param[];
}

export async function createClubEvent(db: D1Database, o: Record<string, unknown>) {
  const res = await run(
    db,
    `INSERT INTO club_events (title, starts_at, ends_at, venue_id, venue, map_url, description, public, signup_enabled,
       capacity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    await clubEventFields(db, o),
  );
  await syncClubEvent(db, Number(res.meta.last_row_id));
  return { id: Number(res.meta.last_row_id) };
}

export async function updateClubEvent(db: D1Database, id: number, o: Record<string, unknown>) {
  const res = await run(
    db,
    `UPDATE club_events SET title = ?, starts_at = ?, ends_at = ?, venue_id = ?, venue = ?, map_url = ?, description = ?,
       public = ?, signup_enabled = ?, capacity = ? WHERE id = ?`,
    [...(await clubEventFields(db, o)), id],
  );
  if (!res.meta.changes) throw new HttpError(404, "No such event.");
  await syncClubEvent(db, id);
}

/** Cancelling keeps the event (and who said they're in), marked as off; un-cancelling puts it back. */
export async function setClubEventCancelled(db: D1Database, id: number, cancelled: boolean, now: string) {
  const res = await run(db, "UPDATE club_events SET cancelled_at = ? WHERE id = ?", [cancelled ? now : null, id]);
  if (!res.meta.changes) throw new HttpError(404, "No such event.");
  await syncClubEvent(db, id);
}
