// Small helpers for the JSON API: replies, and the error a handler throws to refuse a request.

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Whether a request that changes something comes from the app's own pages. Browsers send Origin on every POST, PUT
 * and DELETE, so another site's form or script is refused even where SameSite cookies would let it through (a
 * sibling subdomain). No Origin at all is a script or a test, not a browser, so it has no cookies to abuse.
 */
export function sameOrigin(request: Request): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (origin) return origin === new URL(request.url).origin;
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/** The request's JSON body, as an object, or a 400. */
export async function body(request: Request): Promise<Record<string, unknown>> {
  // A form on another site can send text/plain without asking first; only JSON is accepted (with the Origin check)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    throw new HttpError(415, "Send JSON.");
  try {
    const value = await request.json();
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new HttpError(400, "Send a JSON object.");
}

// Field readers: each returns the value or throws a 400 naming the field.
export function text(o: Record<string, unknown>, key: string, { optional = false, max = 200 } = {}): string {
  const v = o[key];
  if (v == null || v === "") {
    if (optional) return "";
    throw new HttpError(400, `${key} is needed.`);
  }
  if (typeof v !== "string" || v.length > max) throw new HttpError(400, `${key} should be text (up to ${max}).`);
  return v.trim();
}
export function int(o: Record<string, unknown>, key: string, { min = 0, max = 1_000_000, nullable = false } = {}) {
  const v = o[key];
  if (v == null || v === "") {
    if (nullable) return null;
    throw new HttpError(400, `${key} is needed.`);
  }
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max)
    throw new HttpError(400, `${key} should be a whole number from ${min} to ${max}.`);
  return v;
}
export function bool(o: Record<string, unknown>, key: string): boolean {
  const v = o[key];
  if (typeof v !== "boolean") throw new HttpError(400, `${key} should be true or false.`);
  return v;
}
export function oneOf<T extends string>(o: Record<string, unknown>, key: string, allowed: readonly T[]): T {
  const v = o[key];
  if (typeof v !== "string" || !allowed.includes(v as T))
    throw new HttpError(400, `${key} should be one of ${allowed.join(", ")}.`);
  return v as T;
}
export function date(o: Record<string, unknown>, key: string, { nullable = false } = {}): string | null {
  const v = o[key];
  if (v == null || v === "") {
    if (nullable) return null;
    throw new HttpError(400, `${key} is needed.`);
  }
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, `${key} should be a date.`);
  return v;
}
export function time(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  if (typeof v !== "string" || !/^\d{2}:\d{2}$/.test(v)) throw new HttpError(400, `${key} should be a time (HH:MM).`);
  return v;
}
