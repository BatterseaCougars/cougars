// Sanity settings for the Worker's live reads (lib/server/photos.ts). Kept apart so photos.ts stays free
// of astro:env and can be tested on its own. SANITY_PROJECT_ID, SANITY_DATASET and DEMO_CONTENT are
// inlined at build time (astro:env `access: "public"`); SANITY_API_TOKEN is a secret, read from the
// Worker's environment on each request, so it is only there if it's set as a Worker secret (ADR 0016).
import { DEMO_CONTENT, SANITY_API_TOKEN, SANITY_DATASET, SANITY_PROJECT_ID } from "astro:env/server";
import type { PhotosConfig } from "./photos";

export const photosConfig = (): PhotosConfig => ({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  token: SANITY_API_TOKEN,
  demo: DEMO_CONTENT,
});
