import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { cachedCrest } from "../../../lib/server/results";
import { cacheControl } from "../../../lib/server/sanity-env";

export const prerender = false;

// A team's crest on the results (ADR 0100): the small image the team app keeps as a data: URL, as an image. Only for a
// published tournament's team; 404 for anything else.
export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const crest = Number.isInteger(id) && id > 0 ? await cachedCrest(env.DB, id) : null;
  const m = crest?.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return new Response("No such crest.", { status: 404 });
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new Response(bytes, { headers: { "Content-Type": m[1], "Cache-Control": cacheControl(false) } });
};
