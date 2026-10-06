import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { isSpam, parseEnquiry, saveEnquiry } from "../../lib/server/enquiries";
import { rateLimit } from "../../lib/server/rate-limit";
import { enquiryMail } from "../../lib/server/enquiry-mail";
import { clubInbox, mailConfig } from "../../lib/server/mail-env";
import { sendMail } from "../../../../../shared/email";

export const prerender = false;

// Works without JavaScript: a plain form POST gets a 303 redirect. The
// enhanced form on /join sends `Accept: application/json` and gets JSON back.
export const POST: APIRoute = async ({ request, redirect, clientAddress, locals }) => {
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
  // Email the club after answering: the enquiry is already saved, so a failed email never loses it.
  const emailed = sendMail(enquiryMail(parsed.enquiry, id, clubInbox()), mailConfig())
    .then((r) => console.log(JSON.stringify({ event: "enquiry.emailed", id, status: r.status })))
    .catch((error) => console.error(JSON.stringify({ event: "enquiry.email_failed", id, error: String(error) })));
  locals.cfContext.waitUntil(emailed);
  return reply(200, { ok: true }, "/join/thanks");
};
