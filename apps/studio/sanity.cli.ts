import { defineCliConfig } from "sanity/cli";
import { sanityProject } from "@cougars/shared/sanity";

// The dev project unless SANITY_STUDIO_SITE_ENV=production (docs/adr/0010-environments-and-deploys.md).
const { projectId, dataset } = sanityProject(process.env.SANITY_STUDIO_SITE_ENV);

export default defineCliConfig({
  api: { projectId, dataset },
  // Hosted free at https://battersea-cougars.sanity.studio, deployed from `release` (deploy.yml).
  studioHost: "battersea-cougars",
  // appId: the hosted Studio app, so CI deploys don't stop to ask which one (only production is deployed).
  deployment: { autoUpdates: true, appId: "e6jvjj3rw1erb4rr45k97yy0" },
});
