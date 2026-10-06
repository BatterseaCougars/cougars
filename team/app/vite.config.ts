import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { cloudflare } from "@cloudflare/vite-plugin";

// Port 4510 is the team app's (README, Ports). strictPort: never drift onto another project's port.
// The Worker (worker/, the API) runs inside Vite on the same port. Local D1 is the website's
// (apps/web/.wrangler), so `npm run db:migrate:local` and the roster seed serve both.
export default defineConfig(({ command }) => ({
  plugins: [
    svelte(),
    cloudflare({
      persistState: { path: "../../apps/web/.wrangler/state" },
      // Only `vite` on your machine signs you in as the first admin; a build never carries it.
      config: command === "serve" ? { vars: { TEAM_ENV: "local" } } : undefined,
    }),
  ],
  server: { port: 4510, strictPort: true, host: true },
  preview: { port: 4510, strictPort: true, host: true },
}));
