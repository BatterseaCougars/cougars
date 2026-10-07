// Settings for the Worker's live reads (lib/server/photos.ts, lib/server/videos.ts). Kept apart so photos.ts stays free
// of astro:env and can be tested on its own. SANITY_PROJECT_ID, SANITY_DATASET and DEMO_CONTENT are
// inlined at build time (astro:env `access: "public"`); SANITY_API_TOKEN is a secret, read from the
// Worker's environment on each request, so it is only there if it's set as a Worker secret (ADR 0016).
// YOUTUBE_API_KEY is a secret too: a Worker secret in production and dev (deploy.yml), the build's environment
// otherwise.
import { DEMO_CONTENT, SANITY_API_TOKEN, SANITY_DATASET, SANITY_PROJECT_ID, YOUTUBE_API_KEY } from "astro:env/server";
import { CACHE_CONTROL, UNAVAILABLE_CACHE_CONTROL, type PhotosConfig } from "./photos";
import type { VideosConfig } from "./videos";

export const photosConfig = (): PhotosConfig => ({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  token: SANITY_API_TOKEN,
  demo: DEMO_CONTENT,
});

/** A live page's Cache-Control: cached, except when Sanity is unreachable (ADR 0054). */
export const cacheControl = (unavailable: boolean) => (unavailable ? UNAVAILABLE_CACHE_CONTROL : CACHE_CONTROL);

export const videosConfig = (): VideosConfig => ({
  sanity: photosConfig(),
  youtubeKey: YOUTUBE_API_KEY,
  demo: DEMO_CONTENT,
});
