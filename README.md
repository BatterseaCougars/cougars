# Battersea Cougars

Website (and, later, club operations) for the Battersea Cougars inline hockey club.

| Part                   | What                                                                      | Where                 |
| ---------------------- | ------------------------------------------------------------------------- | --------------------- |
| `apps/web`             | Public website: Astro, deployed as a Cloudflare Worker with static assets | http://localhost:4500 |
| `apps/studio`          | Sanity Studio, where the club edits content                               | http://localhost:4520 |
| `db/`                  | D1 (SQLite) migrations                                                    |                       |
| `shared/`              | Code used by more than one app (D1 helpers, test fixtures)                |                       |
| `scripts/`             | Secrets loading (Bitwarden) and CI helpers                                |                       |
| `archive/team-manager` | The old Next.js + Airtable team picker, kept as **reference only**        |                       |

Running cost is £0: every service is on a free tier (see [docs/roadmap.md](docs/roadmap.md)).

## Quick start

```sh
npm ci
npm run db:migrate:local   # create the local D1 database
npm run dev                # http://localhost:4500
npm test
```

To preview the design with sample events and news (dev server only): `DEMO_CONTENT=true npm run dev`.

The site builds and runs **without Sanity**: until a Sanity project is configured, it uses the club copy in
`apps/web/src/lib/sanity/fallback.ts` and shows empty states for news/videos/events/gallery.

With secrets (needs `BWS_ACCESS_TOKEN`, see [docs/setup.md](docs/setup.md)):

```sh
node scripts/env-pull.mjs --status          # list secret names (never values)
node scripts/env-pull.mjs -- npm run dev    # run with secrets injected
```

## Docs

- [docs/setup.md](docs/setup.md): one-time account setup (Cloudflare, Sanity, Bitwarden, GitHub)
- [docs/editing.md](docs/editing.md): guide for club editors (no coding)
- [docs/roadmap.md](docs/roadmap.md): what's next (attendance, payments, Kumite)
- [db/README.md](db/README.md): database conventions
- [CLAUDE.md](CLAUDE.md): conventions for contributors and AI agents

## Ports (devcontainer)

Cougars owns ports **4500-4529** so it doesn't clash with other projects on the host:
4500 web, 4510 ops app, 4520 Sanity Studio.

Opening the devcontainer installs dependencies, migrates the local D1 database and starts **web** and **ops**
automatically (VS Code tasks in `.vscode/tasks.json`, each in its own terminal). Start the Studio with
_Terminal → Run Task… → dev: studio_.
