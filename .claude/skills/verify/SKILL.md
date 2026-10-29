---
name: verify
description: Runs every gate the sandbox CI runs, in order, against a built ARC Control, and reports exact counts and exit codes. Use before every push and whenever someone asks whether the sandbox is green.
---

# Verify

Run from the repository root on Node 22 or later, with ARC built at
`../arc-control`. Record each gate's exit code and counts and report them as a
table. Never summarise a red gate as green. Never re-run a failure hoping it
passes.

| # | Gate | Command | Report |
| --- | --- | --- | --- |
| 1 | Unit tests | `npm ci && npm test` | tests / pass / fail |
| 2 | UI type check and build | `npm run ui:install && npm run ui:build` | exit code |
| 3 | Route coverage | `npm run coverage -- --strict` | routes, unmapped |
| 4 | Stack with live operations | `npm run preflight`; stand-in model on 9911; `LIVE_RATE=120 LIVE_MODE=ai LIVE_AI_EVERY=3 ANTHROPIC_API_KEY=stand-in ANTHROPIC_BASE_URL=http://127.0.0.1:9911 npm run live` in the background | gatewayConfigured |
| 5 | Live on its own | after 30 s: `npm run live:check -- --min 30 --min-episodes 5` | actions, episodes, anomalies |
| 6 | Whole product | `npm run product` | pass / fail per suite |
| 7 | Live after the harness | `npm run live:check -- --min 40 --min-episodes 8` | anomalies |
| 8 | Hosted image (when `deploy/` or the image changed) | `bash deploy/smoke.sh` (behind a TLS-inspecting proxy: build with `--secret id=extra_ca,...`, then `SKIP_BUILD=1`) | checks, failures |

This mirrors `.github/workflows/arc-integration.yml`. If the two disagree, the
workflow is right; fix this file.

Stop the stack afterwards: `lsof -ti tcp:8890,8787,8788,9911 | xargs kill`.
Nothing else may be listening on 8787 or 8890 during gate 8. The smoke test's
"not published" checks would reach it instead of the container.
