#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

message="${1:-Ship UNO Flip updates}"
branch="$(git symbolic-ref --quiet --short HEAD)"
git remote get-url origin >/dev/null
command -v vercel >/dev/null

git add -A
if ! git diff --cached --quiet; then
  git commit -m "$message"
fi
git fetch origin
if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
  git rebase "origin/$branch"
fi
git push --set-upstream origin "$branch"
vercel deploy --prod --yes
