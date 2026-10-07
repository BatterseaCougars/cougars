// "Has anything changed?" for the app's bootstrap (ADR 0054). The app reloads everything after each change and when it
// opens; most of those reloads find nothing new. The bootstrap carries an ETag, and the browser asks again with it
// (If-None-Match) by itself: if the club's data hasn't changed, the answer is an empty 304 after one row read,
// not the whole club read out of D1.
//
// The tag is the club's data version (data_version, one more on every change), who's asking (each member sees their
// own view, ADR 0036), the day (a view depends on it: what's upcoming, who's a Quarterly Member) and the deploy (a new
// build may send a different shape).
import { first, run } from "../../../shared/d1";

// On your own machine, the Worker's code reloads on every change, and with it this
const STARTED = Date.now().toString(36);

export async function dataVersion(db: D1Database): Promise<number> {
  return (await first<{ version: number }>(db, "SELECT version FROM data_version WHERE id = 1"))?.version ?? 0;
}

/** After a change: every member's bootstrap is out of date. */
export async function bumpDataVersion(db: D1Database): Promise<void> {
  await run(
    db,
    `INSERT INTO data_version (id, version) VALUES (1, CAST(strftime('%s', 'now') AS INTEGER))
     ON CONFLICT (id) DO UPDATE SET version = version + 1`,
  );
}

/** The deploy: Cloudflare's version id, or (on your own machine) when this code was loaded. */
export const buildOf = (env: { TEAM_ENV?: string; CF_VERSION_METADATA?: { id: string } }) =>
  (env.TEAM_ENV !== "local" && env.CF_VERSION_METADATA?.id) || STARTED;

export const bootstrapTag = (build: string, version: number, memberId: number, today: string) =>
  `"${build}.${version}.${memberId}.${today}"`;

// The browser keeps the reply but asks before each use; only this member's browser (private)
const REVALIDATE = "private, no-cache";

/** A reply with its tag, which the browser keeps and asks about next time. */
export function tagged(res: Response, tag: string): Response {
  res.headers.set("etag", tag);
  res.headers.set("cache-control", REVALIDATE);
  return res;
}

export const notModified = (tag: string) =>
  new Response(null, { status: 304, headers: { etag: tag, "cache-control": REVALIDATE } });
