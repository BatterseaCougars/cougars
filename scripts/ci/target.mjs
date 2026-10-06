#!/usr/bin/env node
// Point a built site at production or dev (docs/adr/0010-two-environments.md):
// make sure that environment's D1 database exists, then rewrite the config that
// `astro build` generated (apps/web/dist/server/wrangler.json, which `wrangler
// deploy` uses) with its worker name, database and SITE_ENV. Production also gets its domain (from SITE_URL) as a
// Workers custom domain: the deploy creates the DNS records and certificate, on both the bare domain and www.
//
//   node scripts/ci/target.mjs production|dev      (after `npm run build`)
//
// Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID for that environment's account.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const TARGETS = {
  production: { worker: "cougars", db: "cougars" },
  dev: { worker: "cougars-dev", db: "cougars-dev" },
};
const environment = process.argv[2];
const target = TARGETS[environment];
if (!target) throw new Error(`Usage: target.mjs ${Object.keys(TARGETS).join("|")}`);

const cwd = new URL("../../apps/web/", import.meta.url);
const GENERATED = new URL("dist/server/wrangler.json", cwd);
const wrangler = (...args) => execFileSync("npx", ["wrangler", ...args], { encoding: "utf8", cwd });
const find = () => JSON.parse(wrangler("d1", "list", "--json")).find((d) => d.name === target.db);

let db = find();
if (!db) {
  console.log(`Creating D1 database ${target.db} (location: weur)...`);
  wrangler("d1", "create", target.db, "--location", "weur");
  db = find();
}
if (!db?.uuid) throw new Error(`D1 database ${target.db} not found after create`);

const config = JSON.parse(readFileSync(GENERATED, "utf8"));
config.name = target.worker;
config.vars = { ...config.vars, SITE_ENV: environment };
if (environment === "production") {
  const host = URL.canParse(process.env.SITE_URL ?? "") ? new URL(process.env.SITE_URL).hostname : "";
  if (!host || host.endsWith(".workers.dev"))
    throw new Error(`SITE_URL isn't production's domain: "${process.env.SITE_URL}"`);
  config.routes = [host, `www.${host}`].map((pattern) => ({ pattern, custom_domain: true }));
}
config.d1_databases = config.d1_databases.map((d) => ({ ...d, database_name: target.db, database_id: db.uuid }));
writeFileSync(GENERATED, JSON.stringify(config));
console.log(
  `Target ${environment}: worker ${target.worker}, D1 ${target.db} (${db.uuid})` +
    (config.routes ? `, domains ${config.routes.map((r) => r.pattern).join(", ")}` : ""),
);
