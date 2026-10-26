# Paste into Claude Code — ARC Control / Meridian same-day launch

You are the lead TypeScript/Node integration and security engineer for ARC Control. We have TWO sibling repositories: `../arc-control` (canonical product) and this `arc-control-sandbox` (Meridian synthetic enterprise). First read `README.md`, `docs/CLAUDE_CODE_PROMPT.md`, `docs/MASTER_BUILD_PLAN.md`, and the actual ARC 2.0 code/release docs. Do not trust earlier summaries without checking code.

**Your primary mission today is not to add features. It is to obtain the first independently verified 17/17 end-to-end scenarios with the real ARC policy engine and real Meridian business effects.**

Do the following in order:
1. Check git status and create `feature/meridian-integration-validation` in sandbox, without discarding any work.
2. Inspect both repositories, all used ARC public exports, and the exact connector registration/API contracts.
3. Run in `../arc-control`: `npm install`, `npm run build`, `npm run verify`. Record real outputs; do not alter core tests to mask failures.
4. Run in sandbox: `npm test`, `npm run preflight`, `npm start` and (second terminal or launched background process under your direct control) `npm run validate`. If ports are occupied, identify the owner before changing configurations.
5. Repair any compatibility error or false assumption in the sandbox. Never bypass the gateway, fake an API response, or mark a scenario passing from HTTP 200 alone. A permitted action must cause exactly its expected synthetic backend effect, and a denied/held action must cause zero protected effects.
6. Verify the console actually exposes agent inventory, policies, approvals and evidence. Explicitly test denial, approval, agent suspension, disabled tool, direct uncredentialed backend bypass, duplicate execution and role separation of duties.
7. Run `npm run validate` again and preserve generated `reports/latest.json`. Create a concise `docs/INTEGRATION_RESULTS.md` with command outputs, observed 17-case outcome table, known limitations and exact ARC version/commit used.
8. Only after correctness is proven, integrate the three-screen Magic Patterns redesign from `docs/MAGIC_PATTERNS_DAY1_PROMPT.md`; keep UI components isolated, verify with actual `/api/*` responses. Re-run the full suite after design integration.
9. Add deterministic CI with both repos pinned to a known compatible commit. Avoid writing production secrets to workflows, logs or git.
10. Stop with a precise report: what was implemented; what was executed; what passed/failed; what is blocked by current ARC features; and next prioritized changes. Do not claim completed steps that could not be executed.

Boundary: Everything is fictional, local, and isolated. No real payments, employees, customer data, IAM credentials, or cloud destructive changes. Keep management endpoints on localhost; do not deploy this starter publicly. Never weaken ARC policies to make tests pass.
