import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// vite.config.ts pre-bundles every package.json "dependencies" entry at startup, so the dev server never has to
// rebundle mid-session (which 504s an open tab). That only holds if every library the browser imports is listed
// there, not in devDependencies or missing. Svelte is bundled by its plugin.
const root = new URL("../team/app/", import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const bundledByPlugin = new Set(["svelte"]);

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(path);
    return /\.(svelte|ts)$/.test(e.name) && !e.name.endsWith(".test.ts") ? [path] : [];
  });
}

function packageName(specifier) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

describe("adding a library to the team app", () => {
  it("is listed in dependencies, so the dev server bundles it at startup", () => {
    const imported = new Set();
    for (const file of sourceFiles(join(root, "src"))) {
      const code = readFileSync(file, "utf8");
      for (const m of code.matchAll(/(?:^|\n)\s*import\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?["']([^"'./][^"']*)["']/g)) {
        imported.add(packageName(m[1]));
      }
      for (const m of code.matchAll(/import\(\s*["']([^"'./][^"']*)["']\s*\)/g)) imported.add(packageName(m[1]));
    }
    const missing = [...imported].filter((name) => !bundledByPlugin.has(name) && !(name in (pkg.dependencies ?? {})));
    expect(missing, 'move these to team/app package.json "dependencies"').toEqual([]);
    expect(imported.has("ag-grid-community")).toBe(true);
  });
});
