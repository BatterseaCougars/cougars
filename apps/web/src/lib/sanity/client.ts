import { createClient, type SanityClient } from "@sanity/client";
import { SANITY_API_TOKEN, SANITY_DATASET, SANITY_PROJECT_ID } from "astro:env/server";

export const sanityConfigured = Boolean(SANITY_PROJECT_ID);

let client: SanityClient | null = null;

/** Build-time Sanity client, or null until a Sanity project is configured. */
export function sanity(): SanityClient | null {
  if (!SANITY_PROJECT_ID) return null;
  client ??= createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    token: SANITY_API_TOKEN,
    apiVersion: "2025-01-01",
    useCdn: false,
    perspective: "published",
  });
  return client;
}
