#!/usr/bin/env bash
set -euo pipefail

# The cougars repo is bind-mounted at /src.
if [ -f /src/package-lock.json ] && [ -d /src/apps/web ]; then
  ROOT=/src
else
  echo "No cougars package-lock.json found in /src; skipping npm install."
  ROOT=""
fi

install_bw_session_bashrc() {
  local bashrc="/home/node/.bashrc"
  local snippet=""
  if [ -f /src/.devcontainer/bw-session.bashrc ]; then
    snippet=/src/.devcontainer/bw-session.bashrc
  fi
  if [ -z "$snippet" ] || [ ! -f "$bashrc" ]; then
    return 0
  fi
  # Replace the block every start, so a changed snippet reaches existing containers.
  sed -i '/>>> ark-bw-session >>>/,/<<< ark-bw-session <<</d' "$bashrc"
  [ -n "$(tail -c1 "$bashrc")" ] && printf '\n' >> "$bashrc"
  cat "$snippet" >> "$bashrc"
}

install_bw_session_bashrc
if [ -d /commandhistory ]; then
  sudo chown node:node /commandhistory 2>/dev/null || true
fi
# Claude Code chats live in ~/.claude; the named volume keeps them across rebuilds
if [ -d /home/node/.claude ]; then
  sudo chown node:node /home/node/.claude 2>/dev/null || true
fi

if [ -z "$ROOT" ]; then
  exit 0
fi

# Install npm workspaces when package-lock changes
if [ ! -d "$ROOT/node_modules" ] || [ "$ROOT/package-lock.json" -nt "$ROOT/node_modules/.package-lock.json" ] 2>/dev/null; then
  echo "Installing monorepo dependencies..."
  (cd "$ROOT" && npm install)
fi

# Local D1 (apps/web/.wrangler): rebuilt from db/schema.sql, keeping its data (ADR 0050).
(cd "$ROOT" && npm run --silent db:rebuild:local >/dev/null) || echo "Local D1 rebuild failed; run: npm run db:rebuild:local"

echo "Cougars monorepo ready — web :4500 and the team app :4510 start automatically (.vscode/tasks.json). See README.md"
# Cougars' own Bitwarden login (a volume, not the host's: that may be another org's account)
if [ -d "/home/node/.config/Bitwarden CLI" ]; then
  sudo chown -R node:node "/home/node/.config/Bitwarden CLI" 2>/dev/null || true
fi
if command -v bw >/dev/null 2>&1; then
  echo "Secrets: bw-unlock (first time: bw config server https://vault.bitwarden.eu && bw login). docs/setup.md"
fi
