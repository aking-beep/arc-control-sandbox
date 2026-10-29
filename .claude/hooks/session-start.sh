#!/bin/bash
# Readies a Claude Code cloud session: sandbox and UI dependencies, the
# dashboards built, and ARC Control built in the sibling checkout, so
# `npm run lab`, `npm test` and the harness work straight away.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
npm --prefix ui install --no-audit --no-fund
[ -f ui/dist/index.html ] || npm run ui:build

arc="${ARC_REPO_PATH:-$CLAUDE_PROJECT_DIR/../arc-control}"
if [ ! -d "$arc/.git" ]; then
  git clone --quiet https://github.com/aking-beep/arc-control.git "$arc" \
    || { echo "ARC Control is not checked out at $arc and could not be cloned; add the repository to the session." >&2; exit 0; }
fi
if [ ! -f "$arc/apps/control-api/dist/index.js" ]; then
  (cd "$arc" && npm install --no-audit --no-fund && npm run build) \
    || echo "ARC Control did not build at $arc; run npm install && npm run build there." >&2
fi
