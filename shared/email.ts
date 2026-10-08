// Email through the Gmail API (HTTPS, not SMTP), for the website and the team app. Pattern from gwenda-hackney/ark
// (shared/gmail-send.js), with the club's consumer Gmail account: an OAuth refresh token (send-only) instead of a
// Workspace service account. Setup: README.md#gmail. Decision: docs/adr/0027-email-through-gmail-api.md.
//
// Outside production nothing reaches a real person (sendMail always runs safeMail):
//   - production means SITE_ENV is exactly "production"; anything else, including unset, is not;
//   - every recipient is replaced by one safe address: MAIL_SAFE_TO, or else the sending account itself (dev sends
//     from cougars.dev to cougars.dev); the real recipients go in the subject and a header;
//   - the club's own inbox is refused, as the safe address and as the sending account;
//   - without Gmail credentials (a laptop, tests) it logs the email instead of sending.
//
// Gmail is behind a circuit breaker (shared/breaker.ts, ADR 0055): when it's down or has rate-limited the account,
// sends fail at once for a while instead of each waiting for Google, and the sign-in page can say so up front.
import { HttpFailure, QuotaError, guard, pausedUntil, retryAfter } from "./breaker";

export const CLUB_ADDRESS = "batterseahockey@gmail.com";
const FROM_NAME = "Battersea Cougars";

export interface Mail {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
}

export interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface MailConfig {
  /** SITE_ENV: only exactly "production" sends to real recipients. */
  siteEnv: string | undefined;
  /** Null when the secrets aren't there: the email is logged, not sent. */
  gmail: GmailCredentials | null;
  /** Where every email goes outside production. Defaults to the sending account. */
  safeTo?: string | null;
  /** Outside production, addresses that get their own email (the team app's Dev tools list). Ignored in production. */
  allow?: readonly string[];
}

export type SendResult = { status: "sent"; id: string; to: string[] } | { status: "logged"; to: string[] };

export class MailRefused extends Error {}

export const isProduction = (siteEnv: string | undefined) => siteEnv === "production";

/**
 * The email as it may leave this environment. Production: unchanged. Anywhere else: to the safe address only, with
 * the real recipients in the subject and X-Cougars-Original-To. Throws MailRefused rather than risk a real inbox.
 */
export function safeMail(
  mail: Mail,
  {
    siteEnv,
    safeTo,
    allow = [],
  }: { siteEnv: string | undefined; safeTo: string | null | undefined; allow?: readonly string[] },
): Mail & { headers?: Record<string, string> } {
  if (isProduction(siteEnv)) return mail;
  const safe = safeTo?.trim().toLowerCase();
  if (!safe) throw new MailRefused(`No safe address outside production (SITE_ENV=${siteEnv ?? "unset"}); not sending.`);
  if (safe === CLUB_ADDRESS) throw new MailRefused(`The club's inbox can't be the safe address outside production.`);
  const shown = mail.to.join(", ");
  // The dev allow list (set in the team app's Dev tools): when every recipient is on it, they get it themselves. Never
  // the club's inbox; and if anyone isn't on it, the whole email goes to the safe address.
  const allowed = new Set(allow.map((a) => a.trim().toLowerCase()).filter((a) => a && a !== CLUB_ADDRESS));
  const to = mail.to.map((a) => a.trim().toLowerCase());
  const through = to.length > 0 && to.every((a) => allowed.has(a));
  return {
    ...mail,
    to: through ? to : [safe],
    subject: `[${siteEnv || "unset"}, for ${shown}] ${mail.subject}`,
    headers: { "X-Cougars-Original-To": shown },
  };
}

interface AccessToken {
  token: string;
  /** The account the token sends as, from Google's id_token. */
  account: string;
  expiresAt: number;
}
let cachedToken: (AccessToken & { refreshToken: string }) | undefined;

/** An access token for the account, reused until a minute before it expires. Throws on any Google error. */
export async function accessToken(
  gmail: GmailCredentials,
  { fetch = globalThis.fetch, now = Date.now } = {},
): Promise<AccessToken> {
  if (cachedToken?.refreshToken === gmail.refreshToken && cachedToken.expiresAt > now() + 60_000) return cachedToken;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: gmail.clientId,
      client_secret: gmail.clientSecret,
      refresh_token: gmail.refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    id_token?: string;
    error?: string;
  };
  // The error code only (e.g. invalid_grant: the token was revoked); never the response, which holds the token.
  if (!res.ok || !body.access_token)
    throw gmailError(`Gmail token: ${res.status} ${body.error ?? "no access token"}`, res);
  const account = body.id_token ? accountOf(body.id_token) : "";
  if (!account) throw new Error("Gmail token: no account address (re-run scripts/gmail-auth.mjs)");
  cachedToken = {
    refreshToken: gmail.refreshToken,
    token: body.access_token,
    account,
    expiresAt: now() + (body.expires_in ?? 3600) * 1000,
  };
  return cachedToken;
}

/** For tests: forget the cached access token. */
export const clearTokenCache = () => void (cachedToken = undefined);

// The id_token comes straight from Google over TLS in the same response, so its payload is read without verifying.
function accountOf(idToken: string): string {
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  } catch {
    return "";
  }
}

/**
 * Send one email, safely (see the top of this file). Without credentials it logs and returns "logged". Throws on a
 * refusal or a Gmail error; callers that run it after the response (waitUntil) catch and log.
 */
export async function sendMail(
  mail: Mail,
  config: MailConfig,
  { fetch = globalThis.fetch, now = Date.now } = {},
): Promise<SendResult> {
  if (!config.gmail) {
    const safe = safeMail(mail, {
      siteEnv: config.siteEnv,
      safeTo: config.safeTo ?? "nobody@example.invalid",
      allow: config.allow,
    });
    console.log(JSON.stringify({ event: "mail.logged", to: safe.to, subject: safe.subject, text: safe.text }));
    return { status: "logged", to: safe.to };
  }
  const gmail = config.gmail;
  const { token, account } = await guard("gmail", () => accessToken(gmail, { fetch, now }));
  if (!isProduction(config.siteEnv) && account === CLUB_ADDRESS) {
    throw new MailRefused(`Outside production the club's account must never send (it's ${account}).`);
  }
  const safe = safeMail(mail, { siteEnv: config.siteEnv, safeTo: config.safeTo || account, allow: config.allow });
  if (safe.to !== mail.to) {
    console.log(JSON.stringify({ event: "mail.redirected", to: safe.to, originalTo: mail.to }));
  }
  const id = await guard("gmail", async () => {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: base64url(mime(safe, account)) }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      error?: { message?: string; errors?: { reason?: string }[] };
    };
    if (!res.ok || !body.id) {
      const reasons = (body.error?.errors ?? []).map((e) => e.reason ?? "");
      throw gmailError(`Gmail send: ${res.status} ${body.error?.message ?? "no message id"}`, res, reasons);
    }
    return body.id;
  });
  return { status: "sent", id, to: safe.to };
}

/**
 * Google's refusal as an error the circuit breaker understands: a rate limit or a spent sending limit pauses Gmail
 * (for Retry-After, else 15 minutes); another 4xx is ours to fix and doesn't count against Gmail.
 */
function gmailError(message: string, res: Response, reasons: string[] = []): Error {
  if (res.status === 429 || reasons.some((r) => /rateLimitExceeded|dailyLimitExceeded|quotaExceeded/.test(r)))
    return new QuotaError(message, retryAfter(res, 15 * 60_000));
  return new HttpFailure(message, res.status);
}

/** Until when sending is paused by the circuit breaker (epoch ms), or null when email should work. */
export const mailPausedUntil = () => pausedUntil("gmail");

// Header values come partly from a form, so no line breaks may get through (header injection).
const clean = (value: string) => value.replace(/[\r\n]+/g, " ").trim();
const ADDRESS = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;
const address = (value: string) => {
  const a = clean(value);
  if (!ADDRESS.test(a)) throw new MailRefused(`Not an email address: ${JSON.stringify(a)}`);
  return a;
};

const utf8Base64 = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const base64url = (text: string) => utf8Base64(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// RFC 2047 encoded word, so names and subjects can be any language.
const encoded = (text: string) => (/^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${utf8Base64(text)}?=`);

/** The RFC 5322 message: plain UTF-8 text, base64 so long lines and accents survive. */
export function mime(mail: Mail & { headers?: Record<string, string> }, from: string): string {
  const headers = [
    `From: ${encoded(FROM_NAME)} <${address(from)}>`,
    `To: ${mail.to.map(address).join(", ")}`,
    ...(mail.replyTo ? [`Reply-To: ${address(mail.replyTo)}`] : []),
    `Subject: ${encoded(clean(mail.subject))}`,
    ...Object.entries(mail.headers ?? {}).map(([k, v]) => `${k}: ${encoded(clean(v))}`),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];
  const body = utf8Base64(mail.text.replace(/\r?\n/g, "\r\n")).replace(/.{76}/g, "$&\r\n");
  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}
