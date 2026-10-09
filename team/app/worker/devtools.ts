// Dev tools (ADR 0027): what an admin can change outside production without a deploy. For now, who gets their own
// email: everyone else's still goes to the safe inbox (shared/email.ts). In production none of this exists, and the
// list is never read: real recipients always get their own email there.
import { all, run } from "../../../shared/d1";
import { CLUB_ADDRESS, isProduction } from "../../../shared/email";
import { email, type AuthEnv } from "./auth";
import { HttpError } from "./http";

/** Whether Dev tools exist here: anywhere but production. */
export const devToolsHere = (env: { SITE_ENV?: string }) => !isProduction(env.SITE_ENV);

const here = (env: { SITE_ENV?: string }) => {
  if (!devToolsHere(env)) throw new HttpError(404, "Not found.");
};

export async function devMailList(env: AuthEnv): Promise<string[]> {
  here(env);
  const rows = await all<{ email: string }>(env.DB, "SELECT email FROM dev_mail_recipients ORDER BY email");
  return rows.map((r) => r.email);
}

export async function addDevMail(env: AuthEnv, o: Record<string, unknown>, by: number, now: string) {
  here(env);
  const address = email(o);
  if (address === CLUB_ADDRESS) throw new HttpError(400, "Not the club's own inbox: it never gets email from dev.");
  await run(env.DB, "INSERT OR IGNORE INTO dev_mail_recipients (email, added_by, added_at) VALUES (?, ?, ?)", [
    address,
    by,
    now,
  ]);
}

export async function removeDevMail(env: AuthEnv, o: Record<string, unknown>) {
  here(env);
  await run(env.DB, "DELETE FROM dev_mail_recipients WHERE email = ?", [email(o)]);
}
