import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { livePlayer } from "../../../lib/server/players";
import { cacheControl } from "../../../lib/server/sanity-env";

export const prerender = false;

// A flipped card's latest details (lib/roster.ts). 404 for anyone who isn't an active member.
export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const player = Number.isInteger(id) && id > 0 ? await livePlayer(env.DB, id) : null;
  if (!player) return Response.json({ error: "No such player." }, { status: 404 });
  return Response.json(player, { headers: { "Cache-Control": cacheControl(false) } });
};
