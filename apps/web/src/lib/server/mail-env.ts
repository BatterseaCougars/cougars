// Email settings for the Worker (packages/shared/email.ts). SITE_ENV and CONTACT_EMAIL are wrangler vars: target.mjs makes
// SITE_ENV "production" only on release. The Gmail values are Worker secrets (deploy.yml), read on each request.
import { env } from "cloudflare:workers";
import {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  MAIL_SAFE_TO,
  TURNSTILE_SECRET_KEY,
} from "astro:env/server";
import type { MailConfig } from "@cougars/shared/email";

export const mailConfig = (): MailConfig => ({
  siteEnv: env.SITE_ENV,
  gmail:
    GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN
      ? { clientId: GMAIL_CLIENT_ID, clientSecret: GMAIL_CLIENT_SECRET, refreshToken: GMAIL_REFRESH_TOKEN }
      : null,
  safeTo: MAIL_SAFE_TO ?? null,
});

/** The club's inbox, where enquiries go (in production). */
export const clubInbox = () => env.CONTACT_EMAIL;

/** Turnstile's secret for this environment (lib/server/turnstile.ts); unset, nobody counts as verified. */
export const turnstileSecret = () => TURNSTILE_SECRET_KEY;
