#!/usr/bin/env node
// Load secrets from Bitwarden SM into the current CI job, or run a command
// with them locally:
//   node scripts/env-pull.mjs --github-env --environment production|dev   (CI)
//   node scripts/env-pull.mjs -- npm run build                            (local: dev)
//   node scripts/env-pull.mjs --status                                    (names only, no values)
// Your machine is dev unless you pass --environment production.
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { ensureToken, loadSecrets } from "./lib/bitwarden.mjs";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const environment = opt("--environment", "dev");

ensureToken();
const secrets = loadSecrets(environment);

if (flag("--status")) {
  console.log(`Secrets available for ${environment}:`);
  for (const k of Object.keys(secrets).sort()) console.log(`  ${k}`);
} else if (flag("--github-env")) {
  const file = process.env.GITHUB_ENV;
  if (!file) throw new Error("--github-env only works inside GitHub Actions");
  for (const [k, v] of Object.entries(secrets)) {
    for (const line of String(v).split("\n")) if (line.trim()) console.log(`::add-mask::${line}`);
    const delim = `EOF_${crypto.randomUUID()}`;
    appendFileSync(file, `${k}<<${delim}\n${v}\n${delim}\n`);
  }
  console.log(`Exported ${Object.keys(secrets).length} secrets for ${environment}.`);
} else {
  const sep = argv.indexOf("--");
  const cmd = sep >= 0 ? argv.slice(sep + 1) : [];
  if (!cmd.length) {
    console.error("Usage: env-pull.mjs --status | --github-env | -- <command...>");
    process.exit(2);
  }
  const res = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit", env: { ...process.env, ...secrets } });
  process.exit(res.status ?? 1);
}
