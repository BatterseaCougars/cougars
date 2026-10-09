// The website's Worker: Astro answers requests, and a daily cron (wrangler.jsonc triggers) deletes enquiries the
// privacy page says we no longer keep (ADR 0029). Runs whether or not anything deploys.
import { handle } from "@astrojs/cloudflare/handler";
import { expireEnquiries } from "./lib/server/enquiries";

export default {
  fetch: handle,
  async scheduled(controller, env) {
    const deleted = await expireEnquiries(env.DB, new Date(controller.scheduledTime));
    console.log(`Enquiries past 12 months deleted: ${deleted}`);
  },
} satisfies ExportedHandler<Env>;
