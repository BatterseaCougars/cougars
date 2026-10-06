// Fetching from the team app's Worker (team/app/worker/api.ts). Kept apart from the store so the app can load the
// club's data before anything that reads it is imported (main.ts).
import type { Bootstrap } from "../demo/data";

export async function api<T = unknown>(method: string, path: string, payload?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: payload === undefined ? undefined : { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `The server said ${res.status}.`);
  return data as T;
}

export const getBootstrap = () => api<Bootstrap>("GET", "/api/bootstrap");
