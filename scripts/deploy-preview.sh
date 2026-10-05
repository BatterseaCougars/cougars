#!/usr/bin/env bash
# Design preview: build with sample content and deploy to a SEPARATE worker
# (cougars-preview) with its own D1 database, on whichever Cloudflare account
# CLOUDFLARE_API_TOKEN belongs to. Never touches the production `cougars`
# worker, which only deploys from main via .github/workflows/deploy.yml.
#
# Needs CLOUDFLARE_API_TOKEN (account token: Workers Scripts Edit, D1 Edit) and
# CLOUDFLARE_ACCOUNT_ID in the environment. Don't put them in a file:
#   read -rs CLOUDFLARE_API_TOKEN && export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID=<id>
#   bash scripts/deploy-preview.sh
# or from Bitwarden (secrets CLOUDFLARE_API_TOKEN__PREVIEW, CLOUDFLARE_ACCOUNT_ID__PREVIEW):
#   node scripts/env-pull.mjs --environment preview -- bash scripts/deploy-preview.sh
set -euo pipefail
cd "$(dirname "$0")/../apps/web"

NAME=cougars-preview
DB=cougars-preview
GENERATED=dist/server/wrangler.json # written by `astro build`; what `wrangler deploy` uses
json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const f=new Function("x","a","return "+process.argv[1]);process.stdout.write(String(f(JSON.parse(s),process.argv[2])??""))})' "$@"; }

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN (see the top of this script)}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID (see the top of this script)}"

# Preview D1 database, created on first run
id=$(npx wrangler d1 list --json | json 'x.find(d=>d.name===a)?.uuid' "$DB")
if [ -z "$id" ]; then
  npx wrangler d1 create "$DB" --location weur >/dev/null
  id=$(npx wrangler d1 list --json | json 'x.find(d=>d.name===a)?.uuid' "$DB")
fi
echo "D1 $DB: $id"

subdomain=$(curl -fsS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain" | json 'x.result?.subdomain' || true)
export SITE_URL="https://${NAME}.${subdomain:-example}.workers.dev"
export DEMO_CONTENT=true
export PUBLIC_BUILD_VERSION="preview-$(git rev-parse --short HEAD)"
npx astro build

# Point the generated config at the preview worker and database
node -e '
const fs = require("fs");
const [file, name, db, id] = process.argv.slice(1);
const c = JSON.parse(fs.readFileSync(file, "utf8"));
c.name = name;
c.vars = { ...c.vars, SITE_ENV: "preview" };
c.d1_databases = c.d1_databases.map((d) => ({ ...d, database_name: db, database_id: id }));
fs.writeFileSync(file, JSON.stringify(c));
' "$GENERATED" "$NAME" "$DB" "$id"

npx wrangler d1 migrations apply "$DB" --remote
npx wrangler deploy
echo "Preview: $SITE_URL"
