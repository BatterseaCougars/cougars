#!/usr/bin/env bash
# Lists one app's deploy on GitHub's Deployments page, linked to where it runs (ADR 0010).
# The job's own environment (`preview`, `production`) links the website; the team app and the Studio each get an
# environment of their own here, so every app is one click from the Deployments page. Also adds the link to the run's
# summary. Usage: link-deployment.sh <environment> <url> [production]. Needs GH_TOKEN with deployments: write.
set -euo pipefail
name=$1 url=$2 production=${3:+true}

id=$(jq -n --arg ref "$GITHUB_SHA" --arg env "$name" --argjson prod "${production:-false}" \
  '{ref: $ref, environment: $env, production_environment: $prod, auto_merge: false, required_contexts: []}' |
  gh api "repos/$GITHUB_REPOSITORY/deployments" --input - --jq .id)
gh api "repos/$GITHUB_REPOSITORY/deployments/$id/statuses" --silent \
  -f state=success -f environment_url="$url" -F auto_inactive=true \
  -f log_url="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"

echo "- **$name**: $url" >> "$GITHUB_STEP_SUMMARY"
