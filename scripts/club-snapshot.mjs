#!/usr/bin/env node
// What the website takes from the club's D1 at build time (ADR 0043, ADR 0044), each into its own gitignored file under
// apps/web/src/data/ (the roster is personal data, ADR 0033). Run before `astro dev` and `astro build` (apps/web's
// predev/prebuild). Only what the website shows leaves the database.
//   roster.local.json   the active Cougars and their record (lib/roster-sql.mjs)
//   kumite.local.json   the Kumite's awards, as set in the team app's tournament editor
//
//   node scripts/club-snapshot.mjs                   local D1 (apps/web/.wrangler)
//   CLUB_SNAPSHOT_ENV=dev|production node ...       that environment's D1, over the API (CI: CLOUDFLARE_API_TOKEN
//                                                    and CLOUDFLARE_ACCOUNT_ID for its account)
// Never fails a build: whatever can't be read is written as null, and the site falls back (Sanity, samples). An empty
// list is a real answer (no Cougars yet).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { ROSTER_SQL } from "./lib/roster-sql.mjs";

const SNAPSHOTS = {
  roster: { sql: ROSTER_SQL, shape: (rows) => rows, say: (r) => `${r.length} Cougars` },
  kumite: {
    sql: "SELECT awards FROM tournament_types WHERE slug = 'kumite'",
    shape: (rows) => (rows[0] ? { awards: JSON.parse(rows[0].awards) } : null),
    say: (k) => `${k.awards.length} Kumite awards`,
  },
};
const DATABASES = { production: "cougars", dev: "cougars-dev" };
const web = new URL("../apps/web/", import.meta.url);

async function remoteQuery(environment) {
  const name = DATABASES[environment];
  if (!name) throw new Error(`CLUB_SNAPSHOT_ENV should be ${Object.keys(DATABASES).join(" or ")}`);
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
  return async (sql) => (await api(`/${db.uuid}/query`, { method: "POST", body: JSON.stringify({ sql }) }))[0].results;
}

const localQuery = async (sql) =>
  JSON.parse(
    execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--local", "--json", "--command", sql], {
      cwd: web,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  )[0].results;

const environment = process.env.CLUB_SNAPSHOT_ENV;
let query = localQuery;
try {
  if (environment) query = await remoteQuery(environment);
} catch (error) {
  query = () => Promise.reject(error);
}
mkdirSync(new URL("src/data/", web), { recursive: true });
for (const [name, { sql, shape, say }] of Object.entries(SNAPSHOTS)) {
  let data = null;
  try {
    data = shape(await query(sql));
  } catch (error) {
    console.warn(`Club snapshot: no ${name} (${error.message.split("\n")[0]}). The site falls back.`);
  }
  writeFileSync(new URL(`src/data/${name}.local.json`, web), JSON.stringify(data, null, 2) + "\n");
  if (data) console.log(`Club snapshot: ${say(data)}.`);
}
