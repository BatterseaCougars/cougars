#!/usr/bin/env node
// Bring a D1 database up to date with db/migrations/ (after launch, ADR 0050). A database that was already built
// before launch (dev's, yours) has 0001's tables, so 0001 is marked as applied there instead of run; a new one
// (production's first deploy) runs it. Then `wrangler d1 migrations apply` does the rest.
//   node scripts/db-migrate.mjs --local                                 (npm run db:migrate:local)
//   node scripts/db-migrate.mjs --remote -c dist/d1/wrangler.json       (CI)
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const argv = process.argv.slice(2);
const remote = argv.includes("--remote");
if (remote === argv.includes("--local")) {
  console.error("Usage: db-migrate.mjs --local | --remote -c <wrangler config>");
  process.exit(2);
}
const config = argv.includes("-c")
  ? argv[argv.indexOf("-c") + 1]
  : join(import.meta.dirname, "../apps/web/wrangler.jsonc");
const where = [remote ? "--remote" : "--local", "-c", config];

function wrangler(args) {
  const res = spawnSync("npx", ["wrangler", "d1", ...args], { stdio: ["ignore", "inherit", "inherit"] });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

// wrangler's own table, made as wrangler makes it; 0001 marked only where its tables are already there
wrangler([
  "execute",
  "DB",
  ...where,
  "--yes",
  "--command",
  `CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
   INSERT INTO d1_migrations (name) SELECT '0001_launch.sql'
     WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'members')
       AND NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0001_launch.sql')`,
]);
wrangler(["migrations", "apply", "DB", ...where]);
