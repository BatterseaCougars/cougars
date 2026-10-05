// Bitwarden Secrets Manager is the single source of truth for secrets
// (docs/adr/0002-secrets-in-bitwarden.md). Every secret is documented in
// README.md#secrets.
//
// Naming rule (from gwenda-hackney/ark): NAME applies to both environments;
// NAME__PRODUCTION / NAME__DEV override it for that one. Code only ever reads NAME.
// Production values live in the `cougars` project, dev and shared values in
// `cougars-dev`; the dev CI token can't read `cougars` at all.
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

export const ENVIRONMENTS = ["production", "dev"];

// Secrets Manager projects (docs/adr/0012-secrets-manager-projects.md), shared by every app.
export const PROJECTS = { production: "cougars", dev: "cougars-dev" };

/** The project a secret belongs in: NAME__PRODUCTION in `cougars`, everything else in `cougars-dev`. */
export function projectFor(key) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(key)) throw new Error(`"${key}" isn't a secret name: use UPPER_SNAKE_CASE.`);
  const env = key.match(/__([A-Z]+)$/)?.[1];
  if (env && !ENVIRONMENTS.includes(env.toLowerCase())) {
    throw new Error(`"${key}" ends in __${env}: use __PRODUCTION, __DEV or no suffix.`);
  }
  return env === "PRODUCTION" ? PROJECTS.production : PROJECTS.dev;
}

/**
 * Make sure there's a Secrets Manager token: BWS_ACCESS_TOKEN in CI; on your machine COUGARS_LOCAL_BW_TOKEN from
 * the shell, the vault item of that name (if the vault is unlocked), or else a hidden prompt.
 */
export async function ensureToken() {
  if (process.env.BWS_ACCESS_TOKEN || process.env.COUGARS_LOCAL_BW_TOKEN) return;
  const res = spawnSync("bw", ["get", "password", "COUGARS_LOCAL_BW_TOKEN"], { encoding: "utf8" });
  let token = res.status === 0 ? res.stdout.trim() : "";
  if (!token && process.stdin.isTTY) token = await promptHidden("COUGARS_LOCAL_BW_TOKEN: ");
  if (!token) throw new Error("No Bitwarden token. See README.md#bitwarden-tokens.");
  process.env.COUGARS_LOCAL_BW_TOKEN = token;
}

/** Ask for a value on the terminal without echoing it. */
export async function promptHidden(label) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  process.stdout.write(label);
  rl._writeToOutput = () => {}; // hide what's typed or pasted
  const line = await new Promise((resolve) => rl.once("line", resolve));
  rl.close();
  process.stdout.write("\n");
  return line.trim();
}

/**
 * Run bws and parse its JSON output.
 * Our organisation is on the EU server, the default when BWS_SERVER_URL is empty.
 */
export function bws(args) {
  const token = process.env.BWS_ACCESS_TOKEN || process.env.COUGARS_LOCAL_BW_TOKEN;
  if (!token) throw new Error("No Bitwarden token: call ensureToken() first.");
  const env = { ...process.env, BWS_ACCESS_TOKEN: token };
  env.BWS_SERVER_URL ||= "https://vault.bitwarden.eu";
  const res = spawnSync("bws", [...args, "--output", "json"], { encoding: "utf8", env });
  if (res.error) throw new Error(`Could not run bws: ${res.error.message}. Is the Bitwarden CLI installed?`);
  if (res.status !== 0) throw new Error(`bws failed: ${res.stderr.trim().split("\n")[0]}`);
  return JSON.parse(res.stdout);
}

export function loadSecrets(environment) {
  if (!ENVIRONMENTS.includes(environment)) {
    throw new Error(`Unknown environment "${environment}": use ${ENVIRONMENTS.join(" or ")}.`);
  }
  const suffix = `__${environment.toUpperCase()}`;
  const base = {};
  const overrides = {};
  for (const { key, value } of bws(["secret", "list"])) {
    if (key.endsWith(suffix)) overrides[key.slice(0, -suffix.length)] = value;
    else if (!/__[A-Z]+$/.test(key)) base[key] = value;
  }
  if (environment === "production" && !Object.keys(overrides).length) {
    throw new Error("This token can't read production secrets (no NAME__PRODUCTION values visible).");
  }
  return { ...base, ...overrides };
}
