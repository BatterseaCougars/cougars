// Bitwarden Secrets Manager is the single source of truth for secrets.
// GitHub holds only BWS_ACCESS_TOKEN; locally you export it in your shell
// (never commit it, never write secrets to files).
//
// Naming rule (from gwenda-hackney/ark): a secret NAME applies everywhere;
// NAME__PRODUCTION / NAME__PREVIEW override it for that environment.
// Code only ever reads NAME. Every secret is documented in README.md#secrets
// (docs/adr/0002-secrets-in-bitwarden.md).
import { spawnSync } from "node:child_process";

export function loadSecrets(environment = "production") {
  if (!process.env.BWS_ACCESS_TOKEN) {
    throw new Error("BWS_ACCESS_TOKEN is not set. See README.md#secrets.");
  }
  const args = ["secret", "list", "--output", "json"];
  if (process.env.BWS_PROJECT_ID) args.splice(2, 0, process.env.BWS_PROJECT_ID);
  const res = spawnSync("bws", args, { encoding: "utf8", env: process.env });
  if (res.error) throw new Error(`Could not run bws: ${res.error.message}. Is the Bitwarden CLI installed?`);
  if (res.status !== 0) throw new Error(`bws failed: ${res.stderr.trim().split("\n")[0]}`);

  const suffix = `__${environment.toUpperCase()}`;
  const base = {};
  const overrides = {};
  for (const { key, value } of JSON.parse(res.stdout)) {
    if (key.endsWith(suffix)) overrides[key.slice(0, -suffix.length)] = value;
    else if (!/__[A-Z]+$/.test(key)) base[key] = value;
  }
  return { ...base, ...overrides };
}
