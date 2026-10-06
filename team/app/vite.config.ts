import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Port 4510 is the team app's (README, Ports). strictPort: never drift onto another project's port.
export default defineConfig({
  plugins: [svelte()],
  server: { port: 4510, strictPort: true, host: true },
  preview: { port: 4510, strictPort: true, host: true },
});
