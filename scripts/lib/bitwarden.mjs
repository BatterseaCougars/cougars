// Bitwarden Secrets Manager is the single source of truth for secrets
// (docs/adr/0002-secrets-in-bitwarden.md). Every secret is documented in
// README.md#secrets.
//
// Naming rule (from gwenda-hackney/ark): NAME applies to both environments;
// NAME__PRODUCTION / NAME__DEV override it for that one. Code only ever reads NAME.
// Production values live in the `cougars` project, dev and shared values in
// `cougars-dev`; the dev CI token can't read `cougars` at all.
import { spawnSync } from "node:child_process";

export const ENVIRONMENTS = ["production", "dev"];

export function loadSecrets(environment) {
  if (!ENVIRONMENTS.includes(environment)) {
    throw new Error(`Unknown environment "${environment}": use ${ENVIRONMENTS.join(" or ")}.`);
  }
  if (!process.env.BWS_ACCESS_TOKEN) {
    throw new Error("BWS_ACCESS_TOKEN is not set. See README.md#secrets.");
  }
  const res = spawnSync("bws", ["secret", "list", "--output", "json"], { encoding: "utf8", env: process.env });
  if (res.error) throw new Error(`Could not run bws: ${res.error.message}. Is the Bitwarden CLI installed?`);
  if (res.status !== 0) throw new Error(`bws failed: ${res.stderr.trim().split("\n")[0]}`);

  const suffix = `__${environment.toUpperCase()}`;
  const base = {};
  const overrides = {};
  for (const { key, value } of JSON.parse(res.stdout)) {
    if (key.endsWith(suffix)) overrides[key.slice(0, -suffix.length)] = value;
    else if (!/__[A-Z]+$/.test(key)) base[key] = value;
  }
  if (environment === "production" && !Object.keys(overrides).length) {
    throw new Error("This token can't read production secrets (no NAME__PRODUCTION values visible).");
  }
  return { ...base, ...overrides };
}
