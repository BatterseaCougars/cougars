// The team app's Worker (ADR 0022): the JSON API under /api, and the built app for everything else (the assets
// binding falls back to index.html, so the app's own router takes any path).
import { handleApi, type Env } from "./api";

export default {
  async fetch(request: Request, env: Env & { ASSETS: Fetcher }): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env & { ASSETS: Fetcher }>;
