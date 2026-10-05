#!/usr/bin/env bash
# Parallel work streams, each in its own git worktree with its own ports, so they
# can be previewed side by side (docs/roadmap.md).
#
#   bash scripts/worktree.sh add <stream>      # create .worktrees/<stream> on branch <stream>
#   bash scripts/worktree.sh dev <stream>      # run its website (with dev secrets if unlocked)
#   bash scripts/worktree.sh studio <stream>   # run its Sanity Studio
#   bash scripts/worktree.sh stop <stream>     # stop its website (Astro runs it in the background)
#   bash scripts/worktree.sh remove <stream>   # delete the worktree (the branch stays)
#   bash scripts/worktree.sh list
#
# Ports come from the stream's slot, inside Cougars' 4500-4529 range:
#   cms 4501 / studio 4521, youtube 4502 / 4522, gallery 4503 / 4523.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

slot() {
  case "$1" in
    cms) echo 1 ;;
    youtube) echo 2 ;;
    gallery) echo 3 ;;
    *) echo "Unknown stream '$1'. Add it to the slot list in scripts/worktree.sh (slots 1-9)." >&2; exit 1 ;;
  esac
}

cmd="${1:-list}"
name="${2:-}"
[ "$cmd" = list ] || [ -n "$name" ] || { echo "usage: $0 add|dev|studio|stop|remove <stream>" >&2; exit 1; }
dir="$root/.worktrees/$name"

# Dev secrets when the local Bitwarden token is available, otherwise run without (fallback content).
with_env() {
  if [ -n "${COUGARS_LOCAL_BW_TOKEN:-}" ]; then node "$root/scripts/env-pull.mjs" -- "$@"; else "$@"; fi
}

case "$cmd" in
  add)
    n=$(slot "$name")
    if [ ! -d "$dir" ]; then
      if git -C "$root" show-ref --quiet "refs/heads/$name"; then
        git -C "$root" worktree add "$dir" "$name"
      else
        git -C "$root" worktree add "$dir" -b "$name" main
      fi
    fi
    # .env holds local, non-secret overrides only (ADR 0002), so it's safe to copy.
    [ -f "$root/.env" ] && cp "$root/.env" "$dir/.env"
    (cd "$dir" && npm ci --no-audit --no-fund && npm run db:migrate:local)
    echo
    echo "Ready: $dir (branch $name)"
    echo "  website: bash scripts/worktree.sh dev $name     → http://localhost:450$n"
    echo "  studio:  bash scripts/worktree.sh studio $name  → http://localhost:452$n"
    ;;
  dev)
    n=$(slot "$name")
    cd "$dir"
    with_env npm run dev -w @cougars/web -- --port "450$n"
    ;;
  studio)
    n=$(slot "$name")
    cd "$dir/apps/studio"
    with_env npx sanity dev --port "452$n" --host 0.0.0.0
    ;;
  stop)
    (cd "$dir/apps/web" && npx astro dev stop)
    ;;
  remove)
    [ -d "$dir/apps/web" ] && (cd "$dir/apps/web" && npx astro dev stop >/dev/null 2>&1 || true)
    git -C "$root" worktree remove "$dir"
    echo "Removed $dir. Branch '$name' is kept; delete it with: git branch -d $name"
    ;;
  list)
    git -C "$root" worktree list
    ;;
  *)
    echo "usage: $0 add|dev|studio|stop|remove|list <stream>" >&2
    exit 1
    ;;
esac
