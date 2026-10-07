#!/usr/bin/env node
// The website's roster as of this build (docs/adr/0043-roster-from-the-club.md): the active Cougars from D1, written to
// apps/web/src/data/roster.local.json (gitignored: it's personal data, ADR 0033). Run before `astro dev` and
// `astro build` (apps/web's predev/prebuild). Only what the website shows leaves the database.
//   node scripts/roster-snapshot.mjs                 local D1 (apps/web/.wrangler)
//   ROSTER_SNAPSHOT_ENV=dev|production node ...     that environment's D1, over the API (CI: CLOUDFLARE_API_TOKEN
//                                                   and CLOUDFLARE_ACCOUNT_ID for its account)
// Never fails a build: if the database can't be read, it writes null and the site falls back to Sanity or samples.
// An empty list is a real answer (no Cougars yet), and the site says the roster is coming.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { ROSTER_SQL as SQL } from "./lib/roster-sql.mjs";

const DATABASES = { production: "cougars", dev: "cougars-dev" };
const web = new URL("../apps/web/", import.meta.url);
const out = new URL("src/data/roster.local.json", web);

async function remote(environment) {
  const name = DATABASES[environment];
  if (!name) throw new Error(`ROSTER_SNAPSHOT_ENV should be ${Object.keys(DATABASES).join(" or ")}`);
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
  if (!token || !account) throw new Error("needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID");
  const api = async (path, init) => {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const body = await res.json();
    if (!body.success) throw new Error(`D1 API: ${JSON.stringify(body.errors)}`);
    return body.result;
  };
  const db = (await api(`?name=${encodeURIComponent(name)}`)).find((d) => d.name === name);
  if (!db) throw new Error(`no D1 database ${name}`);
  return (await api(`/${db.uuid}/query`, { method: "POST", body: JSON.stringify({ sql: SQL }) }))[0].results;
}

function local() {
  const json = execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--local", "--json", "--command", SQL], {
    cwd: web,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(json)[0].results;
}

let rows = null;
try {
  const environment = process.env.ROSTER_SNAPSHOT_ENV;
  rows = environment ? await remote(environment) : local();
} catch (error) {
  console.warn(`Roster snapshot: none (${error.message.split("\n")[0]}). The site shows its fallback players.`);
}
mkdirSync(new URL("src/data/", web), { recursive: true });
writeFileSync(out, JSON.stringify(rows, null, 2) + "\n");
if (rows) console.log(`Roster snapshot: ${rows.length} Cougars.`);
