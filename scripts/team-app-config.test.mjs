// The team app's local-only switches (ADR 0023): `vite` alone sets TEAM_ENV "local" (the sign-in code shown on screen)
// and TEAM_AUTO_ADMIN (no session means the first admin). A deploy must never carry either: not from wrangler.jsonc,
// and not from scripts/ci/target.mjs, which writes the deployed config's vars. The deploy's smoke test
// (.github/workflows/deploy.yml) then checks the live worker answers 401 without a session.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const LOCAL_ONLY = ["TEAM_ENV", "TEAM_AUTO_ADMIN"];
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
/** JSON with comments and trailing commas, as wrangler reads it. */
const jsonc = (text) =>
  JSON.parse(
    text
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,(\s*[}\]])/g, "$1"),
  );

describe("the team app's deployed config", () => {
  it("never carries the local-only switches", () => {
    const config = jsonc(read("../apps/team/wrangler.jsonc"));
    for (const name of LOCAL_ONLY) expect(config.vars?.[name], name).toBeUndefined();
    const target = read("./ci/target.mjs");
    for (const name of LOCAL_ONLY) expect(target, `target.mjs names ${name}`).not.toContain(name);
  });
});
