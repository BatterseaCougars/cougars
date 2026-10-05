import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemaTypes";
import { structure, SINGLETONS } from "./structure";

// The project ID comes from the environment (README.md#secrets lists it with the other Sanity settings).
const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? "";

// One Studio, two workspaces, so it's always clear which site an edit lands on: the live website reads the
// `production` dataset, the dev site the `dev` dataset (docs/adr/0010-two-environments.md).
const workspaces = [
  { name: "production", title: "Cougars website", subtitle: "Live", basePath: "/live", dataset: "production" },
  { name: "dev", title: "Practice copy", subtitle: "Dev site, not live", basePath: "/practice", dataset: "dev" },
];

export default defineConfig(
  workspaces.map((ws) => ({
    ...ws,
    projectId,
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
  })),
);
