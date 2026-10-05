import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  },
  // Hosted free at https://battersea-cougars.sanity.studio (`npm run deploy`).
  studioHost: "battersea-cougars",
  deployment: { autoUpdates: true },
});
