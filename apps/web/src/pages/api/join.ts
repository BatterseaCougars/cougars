import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { isSpam, parseEnquiry, saveEnquiry } from "../../lib/server/enquiries";
import { rateLimit } from "../../lib/server/rate-limit";

export const prerender = false;

// Works without JavaScript: a plain form POST gets a 303 redirect. The
// enhanced form on /join sends `Accept: application/json` and gets JSON back.
export const POST: APIRoute = async ({ request, redirect, clientAddress }) => {
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  const reply = (status: number, body: Record<string, unknown>, location: string) =>
    wantsJson ? Response.json(body, { status }) : redirect(location, 303);

  const form = await request.formData();
  if (isSpam(form)) return reply(200, { ok: true }, "/join/thanks");

  const { allowed } = await rateLimit(await caches.open("rate-limit"), "join", clientAddress ?? "unknown", {
    limit: 5,
    windowSeconds: 15 * 60,
  });
  if (!allowed)
    return reply(429, { ok: false, error: "Too many submissions, please try again later." }, "/join?error=rate");

  const parsed = parseEnquiry(form);
  if (!parsed.ok) return reply(400, { ok: false, errors: parsed.errors }, "/join?error=invalid");

  const id = await saveEnquiry(env.DB, parsed.enquiry);
  console.log(JSON.stringify({ event: "enquiry.created", id, source: parsed.enquiry.source }));
  // Phase 2: email the club inbox here (Gmail API, via locals.cfContext.waitUntil).
  return reply(200, { ok: true }, "/join/thanks");
};
