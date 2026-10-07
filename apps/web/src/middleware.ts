// Rate limiting for the Worker's live routes (ADR 0056). Prerendered pages are static assets, served without the
// Worker, so this only sees the live ones: photos, videos, What's on, events, player cards and the join form. A
// generous limit per address, enough that no person notices, but a loop or a scraper can't spend the club's free
// quotas (Workers requests, D1 reads, Sanity, YouTube). The join form has its own, tighter limit (pages/api/join.ts).
import { defineMiddleware } from "astro:middleware";
import { rateLimit, type CacheLike } from "../../../shared/rate-limit";

export const LIVE_LIMIT = { limit: 240, windowSeconds: 60 };

/** A 429 if this address has made too many live requests this minute, else null. */
export async function tooMany(cache: CacheLike | null, ip: string, now = Date.now()): Promise<Response | null> {
  if (!cache) return null;
  const { allowed } = await rateLimit(cache, "live", ip, { ...LIVE_LIMIT, now });
  if (allowed) return null;
  console.warn(JSON.stringify({ event: "rate_limit.live", ip }));
  return new Response("Too many requests from here. Wait a minute and try again.", {
    status: 429,
    headers: { "Retry-After": String(LIVE_LIMIT.windowSeconds), "Cache-Control": "no-store" },
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  // At build time there's no visitor, and outside a Worker (astro dev) no Cache API
  if (context.isPrerendered || typeof caches === "undefined") return next();
  const ip = context.request.headers.get("cf-connecting-ip") ?? "unknown";
  return (await tooMany(await caches.open("live-rate-limit"), ip)) ?? next();
});
