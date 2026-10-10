// Club events: one-offs on the calendar (ADR 0042).
import { id, ok, type Route } from "./api.route";
import { HttpError, body, json } from "./http";
import { createClubEvent, setClubEventCancelled, updateClubEvent } from "./schedule";

export const EVENTS_ROUTES: Route[] = [
  {
    method: "POST",
    path: /^\/api\/club-events$/,
    audit: false,
    action: "create:Event",
    changes: ["clubEvents"],
    handle: async (c) => json(await createClubEvent(c.env.DB, await body(c.request)), 201),
  },
  {
    method: "PUT",
    path: /^\/api\/club-events\/(\d+)$/,
    audit: false,
    action: "update:Event",
    changes: ["clubEvents"],
    handle: async (c) => (await updateClubEvent(c.env.DB, id(c), await body(c.request)), ok()),
  },
  {
    method: "POST",
    path: /^\/api\/club-events\/(\d+)\/cancelled$/,
    audit: false,
    action: "update:Event",
    changes: ["clubEvents"],
    handle: async (c) => {
      const b = await body(c.request);
      if (typeof b.cancelled !== "boolean") throw new HttpError(400, "cancelled should be true or false.");
      await setClubEventCancelled(c.env.DB, id(c), b.cancelled, c.now);
      return ok();
    },
  },
];
