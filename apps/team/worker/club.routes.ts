// The club, read: the bootstrap (everything the app shows, ADR 0053) and the live stream of what changed (ADR 0072).
import { type Route } from "./api.route";
import { SLICES, slices, type Slice } from "./api.slices";
import { devToolsHere } from "./devtools";
import { chargeDue } from "./dues";
import { json } from "./http";
import { liveStream } from "./live";
import { ensureSessions } from "./schedule";
import { bootstrapTag, buildOf, dataVersion, notModified, sessionsMade, tagged } from "./version";

export const CLUB_ROUTES: Route[] = [
  {
    method: "GET",
    path: /^\/api\/live$/,
    action: "authenticated",
    // Changes as they happen, as a stream (ADR 0072): only the names of the parts that changed, from the live hub
    handle: async (c) => liveStream(c.env),
  },
  {
    method: "GET",
    path: /^\/api\/bootstrap$/,
    action: "authenticated",
    // Everything the app shows, in one go: it's a small club. Or a 304 when nothing's changed (ADR 0053).
    handle: async (c) => {
      const db = c.env.DB;
      // The coming training sessions, on the day's first open; the rest of the day's opens skip it. First, so the
      // tag is the club as this reply shows it.
      const today = await dataVersion(db);
      let { version } = today;
      if (today.sessionsMadeOn !== c.today) {
        await ensureSessions(db, c.today);
        // ...and whatever the new day makes due (ADR 0007), in case the hourly check hasn't run yet
        await chargeDue(c.env, new Date(c.now));
        await sessionsMade(db, c.today);
        ({ version } = await dataVersion(db));
      }
      const tag = bootstrapTag(buildOf(c.env), version, c.memberId, c.today);
      if (c.request.headers.get("if-none-match") === tag) return notModified(tag);
      const reply = json({
        me: c.memberId,
        actions: [...c.actions],
        // Dev tools (ADR 0027): outside production, for whoever sets the club's settings
        devTools: devToolsHere(c.env) && (c.actions.has("manage:all") || c.actions.has("manage:Settings")),
        // Screens on demo data (Upload): on dev and locally to try, never in production (#63)
        unfinished: devToolsHere(c.env),
        ...(await slices(c, Object.keys(SLICES) as Slice[])),
      });
      return tagged(reply, tag);
    },
  },
];
