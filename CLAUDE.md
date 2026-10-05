# Conventions

Architecture follows gwenda-hackney/ark, simplified. Read README.md first.

## Hard rules

- **Free tiers only.** Don't add a paid service or binding (Cloudflare Images, Durable Objects with storage,
  paid Sanity features, card-payment providers) without asking. Check limits in docs/roadmap.md.
- **Secrets live only in Bitwarden Secrets Manager.** Never print secret values, never write them to files
  (`.env`, `.dev.vars`), never commit them. Use `node scripts/env-pull.mjs --status` to see what exists.
  GitHub holds only `BWS_ACCESS_TOKEN`.
- **Never deploy to production by hand.** Production deploys only from `main` via `.github/workflows/deploy.yml`.
- **D1 migrations are additive.** Never edit a migration that has run. See db/README.md.
- `archive/` is read-only reference. Don't import from it.

## Web app (apps/web)

- Astro 7 + `@astrojs/cloudflare` 14 (Workers with static assets, not Pages).
- Pages are prerendered (`output: "static"`). Server routes opt out with `export const prerender = false`.
- Bindings: `import { env } from "cloudflare:workers"` (e.g. `env.DB`). Execution context: `Astro.locals.cfContext`.
  Run `npx wrangler types` in apps/web after changing `wrangler.jsonc`.
- Content comes from Sanity at build time via `src/lib/sanity/content.ts`. All GROQ lives in `queries.ts`,
  types in `types.ts`. Studio schema field names must match the GROQ projections.
- SQL: plain SQL through `shared/d1.ts` helpers. One module per domain under `src/lib/server/`.
- Forms must work without JavaScript (POST + 303 redirect), enhanced with fetch + JSON.
- Dates: always format in Europe/London via `src/lib/dates.ts`.
- Images: Sanity CDN via `src/lib/sanity/images.ts`; local assets in `src/assets/` (no `public/` except favicons).

## Tests

- Vitest, colocated `*.test.ts`. Database tests use `shared/testing/d1-sqlite.ts` (in-memory SQLite with all
  migrations applied). Test behaviour through real functions, not mocks of our own code.
- Before pushing: `npm run lint && npm test && npm run check -w @cougars/web && npm run build`.

## Ports

4500 web, 4510 ops (reserved), 4520 studio. Don't use framework default ports.
