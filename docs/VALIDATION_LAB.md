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
npm start                # needs ../arc-control built; serves the Lab on http://127.0.0.1:8890
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
| Security Findings | Phase 2 checks `concurrent-idempotency` (ARC-SEC-001) and `policy-change-before-release` (ARC-SEC-002) | Saved Phase 2 report, then BASELINE |
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

## Results in this session (26 Oct 2026)

| Check | Command | Result |
| --- | --- | --- |
| Backend + UI contract unit tests | `npm test` | **12/12 pass** (3 company, 3 fault/stress, 6 new UI-contract) |
| UI type check | `npm run ui:typecheck` | **pass**, 0 errors |
| UI production build | `npm run ui:build` | **pass** (one >500 kB chunk warning) |
| UI dependency audit | `npm audit` in `ui/` | 0 high; 2 moderate in react-router 6.x (see gaps) |
| Preflight | `npm run preflight` | **NOT READY**: `../arc-control` is not present in this environment |
| Integrated stack | `npm start` | **did not start**: ARC Control modules not found |
| Original 17 scenarios | `npm run validate` | **not run**: no running stack (`fetch failed`) |
| Phase 2 + stress | `npm run phase2` | **not run**: no running stack (`fetch failed`) |
| UI smoke, Meridian without ARC | Playwright over all 23 routes | every route rendered, 0 console errors; run buttons disabled; Phase 2 shows BASELINE 31/2/5/1; both findings open; built bundle contains no token |
| UI render of a recorded Phase 2 report | Playwright with a synthetic, uncommitted fixture | both findings shown as FAIL · RECORDED with observed 8 refunds / 1 refund; Inspector shows the ARC-SEC-001 control failure |

The 17-scenario and Phase 2 results therefore remain the committed measurement in `docs/PHASE_2_READINESS.md` (17/17; Phase 2 31 pass, 2 fail, 5 unsupported, 1 not implemented). They were **not** re-executed here. Phase 2 assertions are unchanged, and the two known failures are expected to keep `npm run phase2` non-zero until ARC Control is fixed.

## Remaining integration gaps

1. **Not run end to end here.** The 17 scenarios, Phase 2 and the stress matrix must be re-run with a built `../arc-control` checkout before this branch is treated as verified, then the Lab inspected against those live results.
2. **No live ARC inventory.** Agents, tools and policies come from `src/start.mjs`, not ARC. Phase 2 adds probe agents, tools and temporary `MER-P2-*` policies that the Lab cannot list. Needs read-only `GET /api/arc/{agents,tools,policies,approvals}` proxies.
3. **Effects are matched by count, not id.** Meridian's mutation log has no correlation id, so the Inspector cannot tie one mutation to one ARC action. Passing `correlationId` through the connector to `/internal/*` would close this.
4. **Phase 2 checks return no evidence ids.** The two findings' traces show counts and sequence only.
5. **Run history is in memory.** Session stress runs and Phase 2 runs disappear on restart or `/api/reset`; only `npm run validate` / `npm run phase2` persist results.
6. **ARC build is not reported by the running process.** The Lab shows the ARC git revision recorded in the saved Phase 2 report, which may differ from what is running.
7. **Operator endpoints are unauthenticated.** As before, `/api/*` is loopback-only with no operator auth or CSRF protection. Serving the Lab from anything other than `127.0.0.1` is not safe.
8. **react-router-dom 6.30.6** carries two moderate advisories (backslash open redirect in `<Link>`, SSR hydration). The Lab only links to fixed internal paths and does not use SSR; clearing them needs react-router 7.
9. **Phase 2 mutates shared ARC state.** Running it from the Lab registers probe agents, tools and policies in the live ARC process, which ARC Assurance then reports. Run Phase 2 and the 17 scenarios separately, as the readiness doc advises.
10. **Bundle size.** One 540 kB JS chunk; route-level code splitting would help but is cosmetic for a local tool.
