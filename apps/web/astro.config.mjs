// @ts-check
import { defineConfig, envField } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";

// Pages are prerendered at build time (content comes from Sanity and a publish
// triggers a rebuild). Only routes that opt out with `prerender = false`
// (/api/*, later /kumite/live) run on the Worker. Admin lives in apps/ops.
export default defineConfig({
  site: process.env.SITE_URL ?? "https://cougars.workers.dev",
  output: "static",
  // No Astro sessions: avoids auto-provisioning a KV namespace. Admin auth
  // (phase 3) uses its own signed cookie + D1.
  session: false,
  trailingSlash: "ignore",
  integrations: [sitemap()],
  adapter: cloudflare({
    // Resize local assets at build time with sharp; Sanity's CDN resizes CMS
    // images. Avoids the paid Cloudflare Images binding.
    imageService: "compile",
    prerenderEnvironment: "node",
  }),
  env: {
    schema: {
      SANITY_PROJECT_ID: envField.string({ context: "server", access: "public", optional: true }),
      SANITY_DATASET: envField.string({ context: "server", access: "public", default: "production" }),
      SANITY_API_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
      PUBLIC_BUILD_VERSION: envField.string({ context: "client", access: "public", default: "dev" }),
      // Local design preview with sample events/news (dev server only).
      DEMO_CONTENT: envField.boolean({ context: "server", access: "public", default: false }),
    },
  },
  image: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" }],
  },
  server: { port: 4500, host: true },
  devToolbar: { enabled: false },
  vite: { envDir: "../.." },
});
