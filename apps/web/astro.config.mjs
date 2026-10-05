// @ts-check
import { defineConfig, envField, fontProviders } from "astro/config";
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
  redirects: { "/gallery": "/photos", "/gallery/[slug]": "/photos/[slug]" },
  integrations: [sitemap({ filter: (page) => !page.includes("/join/thanks") })],
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
  // Self-hosted variable font, preloaded, with a metric-matched fallback so text
  // doesn't jump when it loads (Astro Fonts API).
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Inter Tight",
      cssVariable: "--font-sans",
      fallbacks: ["system-ui", "sans-serif"],
      options: {
        variants: [
          {
            src: ["./src/assets/fonts/InterTight-Variable.woff2"],
            weight: "100 900",
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
    // Design concept prototypes (src/pages/concepts). Fetched from Fontsource at build.
    {
      provider: fontProviders.fontsource(),
      name: "Bricolage Grotesque",
      cssVariable: "--font-bricolage",
      weights: ["200 800"],
      fallbacks: ["sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "Unbounded",
      cssVariable: "--font-unbounded",
      weights: ["200 900"],
      fallbacks: ["sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "JetBrains Mono",
      cssVariable: "--font-mono",
      weights: ["400 700"],
      fallbacks: ["monospace"],
    },
  ],
  image: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" }],
  },
  server: { port: 4500, host: true },
  devToolbar: { enabled: false },
  vite: { envDir: "../.." },
});
