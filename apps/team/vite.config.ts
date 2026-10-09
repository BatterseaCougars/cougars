import { readFileSync } from "node:fs";
import net from "node:net";
import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { cloudflare } from "@cloudflare/vite-plugin";

const PORT = 4510;
// The browser's libraries are package.json "dependencies" (scripts/team-app-deps.test.mjs holds every import to that).
const pkg = JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8"));

// Port 4510 is the team app's (README, Ports). strictPort: never drift onto another project's port.
// The Worker (worker/, the API) runs inside Vite on the same port. Local D1 is the website's
// (apps/web/.wrangler), so `npm run db:rebuild:local` and the roster seed serve both.
export default defineConfig(({ command }) => ({
  plugins: [
    oneDevServer(PORT),
    svelte(),
    cloudflare({
      persistState: { path: "../../apps/web/.wrangler/state" },
      // `vite` on your machine is "local": nothing is emailed, so sign-in shows the code on screen. With
      // TEAM_AUTO_ADMIN=1 in the shell (screenshots, quick looks) nobody needs to sign in: you're the first admin.
      // A build never carries either.
      config:
        command === "serve"
          ? {
              vars: {
                TEAM_ENV: "local",
                TEAM_AUTO_ADMIN: process.env.TEAM_AUTO_ADMIN === "1" ? "1" : "",
                // The Usage page (ADR 0059), when started through env-pull: in memory, never in a file
                CLOUDFLARE_ANALYTICS_TOKEN: process.env.CLOUDFLARE_ANALYTICS_TOKEN ?? "",
                CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
              },
            }
          : undefined,
    }),
  ],
  // Vite bundles libraries for the browser and stamps their URLs. If it finds a new one mid-session (a screen
  // that wasn't reached at startup), it rebundles, the stamp changes, and an open tab 504s on the old URLs.
  // So crawl every source file at startup, not just what index.html reaches, and bundle every dependency up front.
  // Svelte's own entry points are added by the Svelte plugin.
  optimizeDeps: {
    entries: ["index.html", "src/**/*.svelte", "src/**/*.ts", "!src/**/*.test.ts"],
    // Our own packages (@cougars/shared) are source, served as is so an edit reloads; only libraries are bundled
    include: Object.keys(pkg.dependencies ?? {}).filter((name) => !name.startsWith("@cougars/")),
  },
  server: { port: PORT, strictPort: true, host: true },
  preview: { port: PORT, strictPort: true, host: true },
}));

// One dev server per checkout. Vite rebuilds node_modules/.vite before it binds the port, so a second `vite`
// here would rewrite the files the running server's page is loading, and only then fail on strictPort.
// Refuse before that. Vite's own restart after a config edit is the same process, so it's let through, and tools
// that only read this config (svelte-check) aren't the `vite` command, so they aren't checked.
function oneDevServer(port: number): Plugin {
  return {
    name: "cougars:one-dev-server",
    apply: "serve",
    async config() {
      if (!/[\\/]vite(\.js)?$/.test(process.argv[1] ?? "")) return;
      if (process.env.COUGARS_TEAM_DEV_PID === String(process.pid)) return;
      const inUse = await new Promise<boolean>((resolve) => {
        const socket = net.connect({ port, host: "127.0.0.1" });
        socket.setTimeout(500);
        socket.once("connect", () => (socket.destroy(), resolve(true)));
        socket.once("timeout", () => (socket.destroy(), resolve(false)));
        socket.once("error", () => resolve(false));
      });
      if (inUse) {
        throw new Error(
          `The team app is already running on ${port}. Use that one (it hot-reloads); a second server here breaks its page.`,
        );
      }
      process.env.COUGARS_TEAM_DEV_PID = String(process.pid);
    },
  };
}
