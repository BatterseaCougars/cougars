// The team app's Worker (ADR 0022): the JSON API under /api, and the built app for everything else (the assets
// binding falls back to index.html, so the app's own router takes any path).
import { handleApi, type Env } from "./api";

// On every response: never shown inside another site's frame, no sniffing a type, and no full URLs to other sites
const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy": "frame-ancestors 'none'",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "same-origin",
};

function secured(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
}

export default {
  async fetch(request: Request, env: Env & { ASSETS: Fetcher }, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/"))
      return secured(await handleApi(request, env, new Date(), (p) => ctx.waitUntil(p)));
    return secured(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<Env & { ASSETS: Fetcher }>;
