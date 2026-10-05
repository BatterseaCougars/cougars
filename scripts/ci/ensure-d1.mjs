#!/usr/bin/env node
// Make sure the D1 database named in wrangler.jsonc exists, then write its id
// into the (CI-local) wrangler.jsonc so `migrations apply --remote` and
// `deploy` can find it. Needs CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const CONFIG = "apps/web/wrangler.jsonc";
const NAME = "cougars";
const wrangler = (...args) => execFileSync("npx", ["wrangler", ...args], { encoding: "utf8" });

let db = JSON.parse(wrangler("d1", "list", "--json")).find((d) => d.name === NAME);
if (!db) {
  console.log(`Creating D1 database ${NAME} (location: weur)...`);
  wrangler("d1", "create", NAME, "--location", "weur");
  db = JSON.parse(wrangler("d1", "list", "--json")).find((d) => d.name === NAME);
}
if (!db?.uuid) throw new Error(`D1 database ${NAME} not found after create`);

const config = readFileSync(CONFIG, "utf8");
if (!config.includes(db.uuid)) {
  writeFileSync(
    CONFIG,
    config.replace(`"database_name": "${NAME}",`, `"database_name": "${NAME}",\n      "database_id": "${db.uuid}",`),
  );
}
console.log(`D1 ${NAME}: ${db.uuid}`);
