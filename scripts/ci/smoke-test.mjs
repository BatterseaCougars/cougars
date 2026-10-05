#!/usr/bin/env node
// Post-deploy check: the right build is live and the key routes work.
//   node scripts/ci/smoke-test.mjs <base-url> <expected-version>
const [base, version] = process.argv.slice(2);
if (!base || !version) throw new Error("usage: smoke-test.mjs <base-url> <expected-version>");

const checks = [
  [
    "home serves this build",
    async () => {
      const html = await (await get("/")).text();
      if (!html.includes(`content="cougars ${version}"`))
        throw new Error("version meta tag not found (old build still cached?)");
    },
  ],
  ["join page", () => get("/join/")],
  ["videos page", () => get("/videos/")],
  ["sitemap", () => get("/sitemap-index.xml")],
  [
    "join API validates",
    async () => {
      const res = await fetch(new URL("/api/join", base), {
        method: "POST",
        // Same-origin, like a browser: Astro rejects form posts from other origins with 403
        headers: { Accept: "application/json", Origin: new URL(base).origin },
        body: new FormData(), // empty: must be rejected, so no row is written
      });
      if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
    },
  ],
];

async function get(path) {
  const res = await fetch(new URL(path, base), { redirect: "follow" });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res;
}

// New deployments can take a few seconds to propagate.
for (let attempt = 1; ; attempt++) {
  const failures = [];
  for (const [name, check] of checks) {
    try {
      await check();
      if (attempt === 1 || failures.length === 0) console.log(`✓ ${name}`);
    } catch (e) {
      failures.push(`✗ ${name}: ${e.message}`);
    }
  }
  if (!failures.length) break;
  if (attempt >= 6) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(`retrying in 10s (${failures.length} failing)...`);
  await new Promise((r) => setTimeout(r, 10_000));
}
console.log(`Smoke test passed for ${base} (${version})`);
