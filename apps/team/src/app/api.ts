// Fetching from the team app's Worker (apps/team/worker/api/api.ts). Kept apart from the store so the app can load the
// club's data before anything that reads it is imported (main.ts).
import type { Bootstrap } from "../demo/data";
import { Brake } from "./brake";
import { BUILD_HEADER } from "./build";
import { heardBuild } from "./update.svelte";

/** Keeps a tab that's gone wrong from spending the club's free allowance (ADR 0055). */
export const brake = new Brake();

/** What the server refused, and how (401: nobody's signed in). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Set once the app is up: from then on, a session that's gone (signed out elsewhere, revoked) reloads to sign-in. */
export const running = { app: false };

export async function api<T = unknown>(method: string, path: string, payload?: unknown): Promise<T> {
  const res = await send(path, {
    method,
    headers: payload === undefined ? undefined : { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  return read<T>(res, path);
}

/** Every call to the Worker: through the brake, which hears how it went. */
async function send(path: string, init?: RequestInit): Promise<Response> {
  const why = brake.take();
  if (why) throw new ApiError(429, why);
  try {
    return await fetch(path, init);
  } catch (e) {
    brake.failed();
    throw e;
  }
}

async function read<T>(res: Response, path: string): Promise<T> {
  const ours = (res.headers.get("content-type") ?? "").includes("application/json");
  const text = await res.text().catch(() => "");
  // Cloudflare's own page for a Worker over its free daily requests says "1027"
  brake.answered(res.status, ours, !ours && res.status === 429 && /\b1027\b/.test(text));
  let data: { error?: string } = {};
  try {
    if (ours && text) data = JSON.parse(text);
  } catch {
    // not what it said it was: treat as no body
  }
  if (res.status === 401 && running.app && !path.startsWith("/api/auth/")) location.replace("/");
  if (!res.ok) throw new ApiError(res.status, data.error ?? `The server said ${res.status}.`);
  return data as T;
}

// The bootstrap's ETag (ADR 0053). The browser keeps the reply and asks with it by itself; an unchanged club comes
// back as the kept copy, with the same tag.
let bootstrapTag: string | null = null;

export async function getBootstrap(): Promise<Bootstrap> {
  const res = await send("/api/bootstrap");
  const data = await read<Bootstrap>(res, "/api/bootstrap");
  bootstrapTag = res.headers.get("etag");
  heardBuild(res.headers.get(BUILD_HEADER));
  return data;
}

/** The whole club, or null if nothing has changed since the last time it was read. */
export async function bootstrapIfChanged(): Promise<Bootstrap | null> {
  const before = bootstrapTag;
  const data = await getBootstrap();
  return before && bootstrapTag === before ? null : data;
}
