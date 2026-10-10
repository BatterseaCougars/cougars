// The club's settings for the app (ADR 0072): one row. For now, how often live pages (a game being scored, the
// tournament's home, the draft room) check for updates. Each check is a request against the club's free daily
// allowance, so it's the admins' call: faster feels live, slower lasts the day. No row yet means the default.
import { run } from "@cougars/shared/d1";
import { int } from "../api/api.http";

export const LIVE_REFRESH_DEFAULT = 10;
export const LIVE_REFRESH_MIN = 5;
export const LIVE_REFRESH_MAX = 120;

export interface Settings {
  liveRefreshSeconds: number;
}

/** The club's settings as read (api.club.ts): its one row, or the defaults before anyone has set them. */
export function settingsFrom(rows: { live_refresh_seconds: number }[]): Settings {
  return { liveRefreshSeconds: rows[0]?.live_refresh_seconds ?? LIVE_REFRESH_DEFAULT };
}

export async function saveSettings(db: D1Database, o: Record<string, unknown>) {
  const seconds = int(o, "liveRefreshSeconds", { min: LIVE_REFRESH_MIN, max: LIVE_REFRESH_MAX })!;
  await run(
    db,
    `INSERT INTO club_settings (id, live_refresh_seconds) VALUES (1, ?)
     ON CONFLICT (id) DO UPDATE SET live_refresh_seconds = excluded.live_refresh_seconds`,
    [seconds],
  );
}
