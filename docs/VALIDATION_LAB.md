# Meridian Validation Lab — UI integration

The Validation Lab is the Magic Patterns React/TypeScript export, integrated into this sandbox as `ui/`. It is a presentation layer over the existing Node backend. ARC Control still makes every authorization decision; Meridian still records every business effect. Nothing in the UI can create a pass.

## Layout

```text
src/            Node backend (unchanged runtime, zero npm dependencies)
  company.mjs     Meridian server: business state, /internal/* connector targets, /api/* for the UI
  scenarios.mjs   17 integration scenarios, load and stress runners
  phase2.mjs      Phase 2 security / reliability / evidence checks
  redact.mjs      strips credential-like keys from anything sent to the browser or a report
tests/          node:test suites (backend, faults, UI contract)
public/         original single-file page, still served at /classic
ui/             Validation Lab (React 18, Vite, Tailwind 4)
  src/api/        typed client, DataProvider (live), ReportsProvider (saved reports)
  src/lib/        status mapping, Phase 2 resolver, finding state, traces
  src/data/       repository facts (catalogue, registry, Phase 2 catalogue copy, committed baseline)
  src/screens/    lab, enterprise and system screens
```

The export overwrote the root `package.json` and `README.md` and mixed `.tsx` files into the backend's `src/`. Both root files were restored and the UI moved to `ui/`. The export carried a second, unused UI tree (`src/lib/LabData.tsx`, `src/screens/*.tsx`, `src/components/*.tsx`, `src/pages/`); it was not reachable from `App.tsx` and was removed. It remains in history at `f989d4e`.

## Running it

```bash
npm test                 # backend + UI contract tests
npm run ui:install       # once
npm run ui:build         # type check + build ui/dist
npm start                # needs ../arc-control built (or ARC_REPO_PATH); serves the Lab on http://127.0.0.1:8890
npm run validate         # 17 scenarios → reports/latest.json      (Lab shows it as RECORDED)
npm run phase2           # Phase 2 + stress → reports/phase2-latest.json (Lab shows it as RECORDED)
```

For UI work, `npm run ui:dev` serves on `http://127.0.0.1:5173` and proxies `/api` to the Meridian server (`MERIDIAN_BASE` overrides the target).

## Endpoint map

| Route | Added here | Used by |
| --- | --- | --- |
| `GET /api/health` | `phase2Configured` field | Status strip, connection banner, run gating |
| `GET /api/state` | — | Enterprise OS, business effects, Evidence Explorer |
| `GET /api/scenarios`, `POST /api/scenarios/:id\|all` | — | Command Center, Scenario Lab, Inspector, Fault Injection |
| `GET /api/phase2`, `POST /api/phase2/:id\|all` | — (Phase 2 harness) | Scenario Lab, Findings, Command Center, Fault Injection |
| `POST /api/stress` | — (Phase 2 harness) | Stress Lab presets (100/5, 500/10, 1000/20, seed 1–3) |
| `POST /api/load` | — | Stress Lab custom concurrency |
| `POST /api/assurance` | — | ARC Assurance |
| `POST /api/reset` | — | Settings |
| `GET /api/reports/integration\|phase2` | yes | Saved `reports/latest.json` / `reports/phase2-latest.json`, redacted. Missing file → `{ report: null }` |
| `GET /api/arc/evidence/:id` | yes | Inspector and Evidence Explorer. Meridian calls ARC `GET /v1/evidence/:id` with its own operator token; the id is validated and the record is redacted before it leaves the server |
| `GET /`, `/assets/*` | yes | Built UI from `ui/dist`; falls back to `public/index.html` if not built |
| `GET /classic` | yes | Original page |

Scenario observations now also carry `correlationId`: the id the runner already sent to ARC with each action, so a result can be matched to ARC's audit trail. No assertion changed.

## Where each screen's data comes from

| Screen | Live source | Fallbacks (labelled) |
| --- | --- | --- |
| Command Center | `/api/health`, `/api/scenarios`, `/api/phase2`, `/api/state`, session stress runs | Saved reports (RECORDED), `docs/PHASE_2_READINESS.md` (BASELINE) |
| Security Findings | Phase 2 checks `concurrent-idempotency` (ARC-SEC-001), `policy-change-before-release` (ARC-SEC-002), `retired-agent-final` (ARC-SEC-003), plus any other failing check | Saved Phase 2 report, then BASELINE |
| Scenario Lab | 17 integration scenarios + 39 Phase 2 checks, each runnable | Saved reports; Phase 2 catalogue copy when the runner is unavailable |
| Live Action Inspector | Integration runs (decision, policy, evidence id, correlation id, backend effect), ARC evidence record on demand, finding traces from the reproducing check | ILLUSTRATIVE example only when "All data" is selected |
| Stress Lab | `/api/stress`, `/api/load` | Three-seed matrix from the saved Phase 2 report |
| Agents, Policies | — | REPO (`src/start.mjs` registration); no live inventory route exists |

## Rules the UI follows

- A status comes from a run on this server (LIVE), a saved report (RECORDED), the committed measurement (BASELINE) or source code (REPO), and is tagged with it. Mixed sources are shown per row.
- `UNSUPPORTED` and `NOT_IMPLEMENTED` are never passes. A Phase 2 pass that reproduces a documented limitation is marked as such.
- A failure the runner attributes to infrastructure (`fetch failed`, `ECONNREFUSED`, not initialized) is `ERROR`, not `FAIL`; an effect count the runner does not report renders as **unknown**, never as zero.
- Findings are never auto-resolved. If the reproducing check passes, the finding moves to "Check passing · retest pending" and stays listed. Removing it means editing `ui/src/data/baseline.ts` after the ARC fix has been independently retested.
- Run buttons are enabled only when Meridian is reachable **and** reports `gatewayConfigured: true` (Phase 2 also needs `phase2Configured`).
- The browser never calls ARC and holds no credential. `tests/ui-contract.test.mjs` fails if UI source sets the connector header, sends a bearer token, calls `/v1/` or `:8787`, or reads server secrets.

## Measured results — 26 Oct 2026

| Piece | Revision |
| --- | --- |
| Sandbox | `bdf2c21` (this branch, before the result-driven fixes below) |
| ARC Control `main` | `162d00dcb89e23e4bcbb8328e0f74f63075b1a3b` |
| Node | 22.22.0 |

`ARC_REPO_PATH` pointed at a fresh clone of `aking-beep/arc-control`. One loopback process with MemoryStore. Not an enterprise certification.

| Check | Command | Result |
| --- | --- | --- |
| ARC Control build, tests, evals | `npm run verify` (in arc-control) | **pass**: 356/356 tests, 66/66 eval properties |
| Sandbox unit + UI contract tests | `npm test` | **12/12 pass** |
| UI type check / build | `npm run ui:typecheck`, `npm run ui:build` | **pass** (one chunk-size warning) |
| Preflight | `npm run preflight` | **READY** |
| Original 17 scenarios | `npm run validate` | **17/17 pass**; 13 results carry a `correlationId` (the 4 without are non-agent requests or approval releases) |
| Phase 2 + stress + 17 recheck | `npm run phase2` | **exit 1**: 30 pass, **3 fail**, 5 unsupported, 1 not implemented. Stress 9/9 runs pass. 17/17 still pass afterwards |
| ARC Assurance (after Phase 2, same process) | `POST /api/assurance` | 2 pass · 4 fail · 2 not_assessable · 1 not_applicable · 0 attested |
| API smoke on live stack | curl | `/api/arc/evidence/:id` → 200 with ARC record (`integrityDigest` present, no credential keys); unknown id → 404; malformed id → 400; `/api/reports/*` serve the saved reports |
| Live UI, Playwright | Lab on :8890 against the stack | Command Center shows Phase 2 LIVE 30/3/5/1 and three findings; a scenario run from the UI passes; Inspector shows its correlation id, DENY and 0 refunds; its ARC evidence record loads; Assurance run renders per-control results; stress preset 100 reconciles 50/50; 0 console errors |

### Phase 2 failures (assertions unchanged)

| Check | Error | Finding | Status vs aa2f37c |
| --- | --- | --- | --- |
| `concurrent-idempotency` | round 1 produced 8 refunds for one idempotency key | ARC-SEC-001 | still failing |
| `policy-change-before-release` | queued refund was released after a stricter policy (HTTP 200, outcome executed, effects 1) | ARC-SEC-002 | still failing |
| `retired-agent-final` | activate retired agent HTTP 200 | **ARC-SEC-003 (new)** | **regressed**: passed against aa2f37c |

ARC-SEC-003, from source in 162d00d: `POST /v1/agents/:id/activate` calls `gateway.admin.setAgentStatus(id, 'active')`, which calls `registry.resume()` → `#setStatus`. That path skips the retired guard that `registry.activate()` has, so a retired agent can be set active again. Because `issueKey` only refuses agents whose status is `retired`, a revived agent could then be issued a new credential (inferred from source; the check stops at the first failed assertion and did not exercise it). Fix belongs in arc-control: route activate through `registry.activate()`, or add the guard to `resume()`.

`npm run phase2` therefore exits non-zero. That is the result, not a broken runner.

### Stress (three seeds)

| Preset | Seed | Requests/s | p50 / p95 / p99 (ms) | Refunds exp/obs | Other mutations | Unexpected |
| --- | --- | --- | --- | --- | --- | --- |
| 100 · c5 | 1 / 2 / 3 | 502.51 / 613.50 / 649.35 | 10/17/20 · 9/14/16 · 5/14/14 | 50/50 each | 0 | 0 |
| 500 · c10 | 1 / 2 / 3 | 657.03 / 788.64 / 865.05 | 16/25/29 · 12/20/24 · 12/19/20 | 250/250 each | 0 | 0 |
| 1000 · c20 | 1 / 2 / 3 | 932.84 / 1031.99 / 1046.03 | 22/31/38 · 18/29/30 · 22/28/34 | 500/500 each | 0 | 0 |

### Fixed because of the live run

- **Assurance screen crash.** The export treated `summary.controls` as an array; ARC returns a count. Per-control results now come from the run's `assessments[]`.
- **New failures were invisible.** Findings covered only the two known checks. ARC-SEC-003 was added, and any other failing Phase 2 check without a finding is now listed on the Findings page and the Command Center.
- **Baseline** figures in the UI now point at this measurement (30/3/5/1, assurance 2/4/2/1/0). The earlier aa2f37c run stays in `docs/PHASE_2_READINESS.md`.

## Remaining integration gaps

1. **Three ARC defects stay open** (ARC-SEC-001, 002, 003). They are fixed in arc-control, not here, and stay listed until independently retested.
2. **`mcp-drift-runtime-enforcement` may be mis-labelled.** It is a static `unsupported` entry in `phase2.mjs`, but ARC 162d00d ships evals named "an MCP tool rewritten after registration is refused at execution" and "a write tool verifies its pin before every call". The capability may now exist; it needs a real Phase 2 check before the label changes either way.
3. **No live ARC inventory.** Agents, tools and policies come from `src/start.mjs`, not ARC. Phase 2 probe agents/tools and temporary `MER-P2-*` policies are not listed. Needs read-only `GET /api/arc/{agents,tools,policies,approvals}`.
4. **Effects matched by count, not id.** Meridian's mutation log has no correlation id. Approval releases (`/v1/approvals/:id/execute`) return no agent correlation id to the runner.
5. **Phase 2 checks return no evidence ids**, so finding traces show counts and sequence only.
6. **Run history is in memory**; only `npm run validate` / `npm run phase2` persist results (`reports/` is git-ignored).
7. **ARC build of the running process is not reported**; the Lab shows the revision recorded in the saved Phase 2 report.
8. **Operator endpoints are unauthenticated** and loopback-only, as before.
9. **react-router-dom 6.30.6** has two moderate advisories; clearing them needs react-router 7.
10. **Phase 2 mutates shared ARC state** (probe agents, tools, policies), which ARC Assurance then reports as failures. Run it separately from the 17.
11. **Bundle size**: one ~540 kB chunk.
