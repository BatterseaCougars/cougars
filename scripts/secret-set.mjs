#!/usr/bin/env node
// Add or update a secret in Bitwarden SM, in the project its name says
// (docs/adr/0012-secrets-manager-projects.md):
//   node scripts/secret-set.mjs CLOUDFLARE_API_TOKEN__DEV          (prompts, input hidden)
//   pbpaste | node scripts/secret-set.mjs SANITY_API_TOKEN         (reads stdin)
// NAME__PRODUCTION goes to `cougars`, anything else to `cougars-dev`. The value is never printed.
// Document the secret in README.md#secrets in the same change.
import { bws, ensureToken, projectFor, promptHidden } from "./lib/bitwarden.mjs";

const key = process.argv[2];
if (!key || process.argv.length > 3) {
  console.error("Usage: secret-set.mjs NAME   (value from a hidden prompt or stdin)");
  process.exit(2);
}
const projectName = projectFor(key);
await ensureToken();

const project = bws(["project", "list"]).find((p) => p.name.trim().toLowerCase() === projectName);
if (!project) {
  throw new Error(`This token can't see the project "${projectName}". Check the machine account's project access.`);
}

const value = await readValue(`${key} (${projectName}): `);
if (!value) throw new Error("Empty value, nothing saved.");

const existing = bws(["secret", "list", project.id]).find((s) => s.key === key);
if (existing) bws(["secret", "edit", existing.id, "--value", value]);
else bws(["secret", "create", key, value, project.id]);
console.log(`${existing ? "Updated" : "Created"} ${key} in ${projectName}.`);
if (!existing) console.log("Now document it in README.md#secrets.");

async function readValue(prompt) {
  if (process.stdin.isTTY) return promptHidden(prompt);
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}
