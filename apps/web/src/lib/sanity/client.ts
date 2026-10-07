import { createClient, type SanityClient } from "@sanity/client";
import { CACHE_READS, SANITY_API_TOKEN, SANITY_DATASET, SANITY_PROJECT_ID } from "astro:env/server";

export const sanityConfigured = Boolean(SANITY_PROJECT_ID);

/**
 * True inside the Worker (server routes such as /photos, which still render the footer's settings), false
 * while prerendering in Node at build time. On the production Worker, reads go through the API CDN (ADR 0016).
 */
export const onWorker = globalThis.navigator?.userAgent === "Cloudflare-Workers";

let client: SanityClient | null = null;

/** Sanity client (build time, or the Worker's server routes), or null until a Sanity project is configured. */
export function sanity(): SanityClient | null {
  if (!SANITY_PROJECT_ID) return null;
  client ??= createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    token: SANITY_API_TOKEN,
    apiVersion: "2025-01-01",
    useCdn: onWorker && CACHE_READS,
    perspective: "published",
  });
  return client;
}
