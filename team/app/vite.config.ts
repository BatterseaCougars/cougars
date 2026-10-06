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
      // `vite` on your machine is "local": nothing is emailed, so sign-in shows the code on screen. With
      // TEAM_AUTO_ADMIN=1 in the shell (screenshots, quick looks) nobody needs to sign in: you're the first admin.
      // A build never carries either.
      config:
        command === "serve"
          ? { vars: { TEAM_ENV: "local", TEAM_AUTO_ADMIN: process.env.TEAM_AUTO_ADMIN === "1" ? "1" : "" } }
          : undefined,
    }),
  ],
  server: { port: 4510, strictPort: true, host: true },
  preview: { port: 4510, strictPort: true, host: true },
}));
