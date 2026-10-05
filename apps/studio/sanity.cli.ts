import { defineCliConfig } from "sanity/cli";
import { sanityProject } from "../../shared/sanity";

// The dev project unless SANITY_STUDIO_SITE_ENV=production (docs/adr/0017-two-sanity-projects.md).
const { projectId, dataset } = sanityProject(process.env.SANITY_STUDIO_SITE_ENV);

export default defineCliConfig({
  api: { projectId, dataset },
  // Hosted free at https://battersea-cougars.sanity.studio, deployed from `release` (deploy.yml).
  studioHost: "battersea-cougars",
  deployment: { autoUpdates: true },
});
