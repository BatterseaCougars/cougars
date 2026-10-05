import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { sanityProject } from "../../shared/sanity";
import { schemaTypes } from "./schemaTypes";
import { structure, SINGLETONS } from "./structure";

// One project per environment (docs/adr/0017-two-sanity-projects.md). The hosted Studio is built with
// SANITY_STUDIO_SITE_ENV=production (deploy.yml); a local Studio is always the dev project.
const live = process.env.SANITY_STUDIO_SITE_ENV === "production";
const { projectId, dataset } = sanityProject(live ? "production" : "dev");

export default defineConfig({
  name: live ? "live" : "dev",
  title: live ? "Cougars website" : "Cougars dev site",
  subtitle: live ? "Live" : "Practice copy, not live",
  projectId,
  dataset,
  plugins: [structureTool({ structure }), visionTool()],
  // The GROQ playground (Vision) is for developers: only administrators see it.
  tools: (tools, { currentUser }) =>
    currentUser?.roles.some((r) => r.name === "administrator") ? tools : tools.filter((t) => t.name !== "vision"),
  schema: {
    types: schemaTypes,
    // Hide singletons from the global "New document" menu.
    templates: (templates) => templates.filter(({ schemaType }) => !SINGLETONS.has(schemaType)),
  },
  document: {
    // Singletons can only be edited and published, never duplicated or deleted.
    actions: (actions, { schemaType }) =>
      SINGLETONS.has(schemaType)
        ? actions.filter(({ action }) => action && ["publish", "discardChanges", "restore"].includes(action))
        : actions,
  },
});
