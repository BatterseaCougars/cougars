// The team app's Worker (ADR 0022): the JSON API under /api, and the built app for everything else (the assets
// binding falls back to index.html, so the app's own router takes any path).
import { handleApi, type Env } from "./api";
import { checkUsage } from "./usage";
import { rebuildWebsite } from "./website";
// The live hub (ADR 0072): Cloudflare finds the Durable Object class here
export { LiveHub } from "./live";

// On every response the Worker sends. The app's pages and files are mostly served by the asset layer without the
// Worker (wrangler.jsonc: run_worker_first is /api/* only), so public/_headers carries the same set for them; a test
// keeps the two the same (security.test.ts, ADR 0036). The policy: the app runs only its own scripts, styles, fonts
// and files, talks only to its own origin, shows its own images and the ones it makes (team logos as data URLs,
// previews as blob URLs), and is never shown inside another site's frame.
export const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
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
  async scheduled(controller: ScheduledController, env: Env) {
    const now = new Date(controller.scheduledTime);
    // Every five minutes (wrangler.jsonc triggers): a wanted website rebuild, once it's quiet (ADR 0100)
    if (controller.cron === "*/5 * * * *") await rebuildWebsite(env, now);
    // Hourly: warn the admins before the free allowance runs out (ADR 0059)
    else await checkUsage(env, now);
  },
} satisfies ExportedHandler<Env & { ASSETS: Fetcher }>;
