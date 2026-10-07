// Who's in (T2): sign-ups for training sessions, tournaments and club events, and the register on the night. One
// row per person per event (db/migrations/0005_team_entries.sql). The rules live here, not in the app: a full
// event puts you on the waitlist, and when someone who was in drops out (or is taken off) the first on the
// waitlist moves up. Admins can put someone in past the limit.
import { all, first, run } from "../../../shared/d1";
import { londonToday } from "../src/lib/dates";
import { HttpError } from "./http";
import { offTeams } from "./teams";

export type EntryKind = "session" | "tournament" | "event";
export type Answer = "in" | "out";

const TABLES = {
  session: { table: "attendance", key: "session_id" },
  tournament: { table: "tournament_entries", key: "tournament_id" },
  event: { table: "club_event_entries", key: "event_id" },
} as const;

/** What the app shows for one event: ids in sign-up order. */
export interface Entries {
  going: number[];
  waitlist: number[];
  out: number[];
  walkIns: number[];
  noShows: number[];
}

/** Whether the event exists and takes sign-ups, and its limit (null: no limit). */
async function capacity(db: D1Database, kind: EntryKind, id: number): Promise<number | null> {
  const row =
    kind === "session"
      ? await first<{ capacity: number | null; cancelled: string | null }>(
          db,
          `SELECT COALESCE(s.capacity, ts.capacity) capacity, s.cancelled_at cancelled
           FROM training_sessions s JOIN training_series ts ON ts.id = s.series_id WHERE s.id = ?`,
          [id],
        )
      : kind === "tournament"
        ? await first<{ capacity: number | null; cancelled: null }>(
            db,
            "SELECT capacity, NULL cancelled FROM tournaments WHERE id = ?",
            [id],
          )
        : await first<{ capacity: number | null; cancelled: null; signup: number }>(
            db,
            "SELECT capacity, NULL cancelled, signup_enabled signup FROM club_events WHERE id = ?",
            [id],
          );
  if (!row) throw new HttpError(404, "No such event.");
  if (row.cancelled) throw new HttpError(409, "That session's cancelled.");
  if ("signup" in row && !row.signup) throw new HttpError(409, "That event doesn't take sign-ups.");
  return row.capacity;
}

async function current(db: D1Database, kind: EntryKind, id: number, memberId: number) {
  const { table, key } = TABLES[kind];
  return first<{ signup: string; walkIn: number }>(
    db,
    `SELECT signup, ${kind === "session" ? "walk_in" : "0"} walkIn FROM ${table} WHERE ${key} = ? AND member_id = ?`,
    [id, memberId],
  );
}

// Two people at once: each statement is atomic, but two requests' statements can interleave. So whether there's a
// place is decided inside the statement that takes it, never counted first and written after (entries.test.ts).
const roomIn = (table: string, key: string) =>
  `(? IS NULL OR (SELECT COUNT(*) FROM ${table} WHERE ${key} = ? AND signup = 'in') < ?)`;

/** Write someone's answer. `join` is in if there's a place, else the waitlist, decided in the same statement. */
async function put(
  db: D1Database,
  kind: EntryKind,
  id: number,
  memberId: number,
  signup: "in" | "out" | { join: number | null },
  now: string,
) {
  const { table, key } = TABLES[kind];
  // A fresh answer clears what the register said about an old one
  const reset = kind === "session" ? ", attended = NULL, walk_in = 0" : "";
  const join = typeof signup === "object";
  await run(
    db,
    `INSERT INTO ${table} (${key}, member_id, signup, signed_up_at)
     VALUES (?, ?, ${join ? `CASE WHEN ${roomIn(table, key)} THEN 'in' ELSE 'waitlist' END` : "?"}, ?)
     ON CONFLICT (${key}, member_id) DO UPDATE SET signup = excluded.signup, signed_up_at = excluded.signed_up_at${reset}`,
    join ? [id, memberId, signup.join, id, signup.join, now] : [id, memberId, signup, now],
  );
}

/** A place came free: the first on the waitlist moves up, if there's still room as it does. */
async function moveUp(db: D1Database, kind: EntryKind, id: number, limit: number | null, now: string) {
  const { table, key } = TABLES[kind];
  await run(
    db,
    `UPDATE ${table} SET signup = 'in', signed_up_at = ?
     WHERE id = (SELECT id FROM ${table} WHERE ${key} = ? AND signup = 'waitlist' ORDER BY signed_up_at, id LIMIT 1)
       AND ${roomIn(table, key)}`,
    [now, id, limit, id, limit],
  );
}

/** A member says in or out for themselves. In on a full event is the waitlist. */
export async function answer(db: D1Database, kind: EntryKind, id: number, memberId: number, a: Answer, now: string) {
  const limit = await capacity(db, kind, id);
  const was = await current(db, kind, id, memberId);
  if (a === "out") {
    if (was?.signup === "out") return;
    await put(db, kind, id, memberId, "out", now);
    if (was?.signup === "in") {
      if (kind === "session") await offTeams(db, id, memberId);
      await moveUp(db, kind, id, limit, now);
    }
    return;
  }
  if (was?.signup === "in" || was?.signup === "waitlist") return;
  // A tournament's sign-up closes at the end of its last day (London); saying you're out is always fine
  if (kind === "tournament") {
    const t = await first<{ closes: string | null }>(
      db,
      "SELECT signup_closes_on closes FROM tournaments WHERE id = ?",
      [id],
    );
    if (t?.closes && londonToday(new Date(now)) > t.closes) throw new HttpError(409, "Sign-up has closed.");
  }
  await put(db, kind, id, memberId, { join: limit }, now);
}

/** An admin puts someone in (past the limit, if need be) or takes them off altogether. */
export async function setPlayer(
  db: D1Database,
  kind: EntryKind,
  id: number,
  memberId: number,
  inIt: boolean,
  now: string,
) {
  const limit = await capacity(db, kind, id);
  const was = await current(db, kind, id, memberId);
  if (inIt) {
    if (was?.signup !== "in") await put(db, kind, id, memberId, "in", now);
    return;
  }
  if (!was) return;
  const { table, key } = TABLES[kind];
  await run(db, `DELETE FROM ${table} WHERE ${key} = ? AND member_id = ?`, [id, memberId]);
  if (kind === "session") await offTeams(db, id, memberId);
  if (was.signup === "in") await moveUp(db, kind, id, limit, now);
}

/**
 * The register on the night. A sign-up is expected: unticking marks a no-show, ticking takes it back. Anyone else
 * ticked is a walk-in, in tonight whatever the limit; unticking a walk-in takes them off again.
 */
export async function mark(
  db: D1Database,
  sessionId: number,
  memberId: number,
  here: boolean,
  by: number,
  now: string,
) {
  const limit = await capacity(db, "session", sessionId);
  const was = await current(db, "session", sessionId, memberId);
  if (was?.signup === "in" && !was.walkIn) {
    await run(
      db,
      "UPDATE attendance SET attended = ?, recorded_by = ?, recorded_at = ? WHERE session_id = ? AND member_id = ?",
      [here ? 1 : 0, by, now, sessionId, memberId],
    );
    return;
  }
  if (here) {
    await run(
      db,
      `INSERT INTO attendance (session_id, member_id, signup, signed_up_at, attended, walk_in, recorded_by, recorded_at)
       VALUES (?, ?, 'in', ?, 1, 1, ?, ?)
       ON CONFLICT (session_id, member_id) DO UPDATE SET signup = 'in', signed_up_at = excluded.signed_up_at,
         attended = 1, walk_in = 1, recorded_by = excluded.recorded_by, recorded_at = excluded.recorded_at`,
      [sessionId, memberId, now, by, now],
    );
    return;
  }
  if (was?.walkIn) {
    await run(db, "DELETE FROM attendance WHERE session_id = ? AND member_id = ?", [sessionId, memberId]);
    await offTeams(db, sessionId, memberId);
    await moveUp(db, "session", sessionId, limit, now);
  }
}

/** Everyone's answers for the given events, keyed by event id. */
export async function listEntries(db: D1Database, kind: EntryKind, ids: number[]): Promise<Map<number, Entries>> {
  const { table, key } = TABLES[kind];
  const out = new Map<number, Entries>(
    ids.map((id) => [id, { going: [], waitlist: [], out: [], walkIns: [], noShows: [] }]),
  );
  if (!ids.length) return out;
  const extra = kind === "session" ? "walk_in walkIn, attended" : "0 walkIn, NULL attended";
  const rows = await all<{
    eventId: number;
    memberId: number;
    signup: string;
    walkIn: number;
    attended: number | null;
  }>(
    db,
    `SELECT ${key} eventId, member_id memberId, signup, ${extra} FROM ${table}
     WHERE ${key} IN (SELECT value FROM json_each(?)) ORDER BY signed_up_at, id`,
    [JSON.stringify(ids)],
  );
  for (const r of rows) {
    const e = out.get(r.eventId);
    if (!e) continue;
    if (r.signup === "in") e.going.push(r.memberId);
    else if (r.signup === "waitlist") e.waitlist.push(r.memberId);
    else e.out.push(r.memberId);
    if (r.walkIn) e.walkIns.push(r.memberId);
    if (r.attended === 0) e.noShows.push(r.memberId);
  }
  return out;
}
