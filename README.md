# Meridian Commerce Group — ARC Control Synthetic Enterprise

A **working starter integration harness** for `aking-beep/arc-control` 2.0. It is not an enterprise production system and not an ARC certification.

Meridian is a fictional company with six operational departments, a real in-process business state, six registered agent identities, six protected tool endpoints, six ARC policy documents, a custom ARC Control API bootstrap using its shipped **GenericHttpConnector**, ARC's native operator console, and **17 executable authorization scenarios**. A bounded concurrent load runner sends **100–1,000 real requests** through the ARC API and compares the outcomes with Meridian's own mutation log.

## Current verification level

- Verified here: local backend unit tests (`npm test`), including refusal of unauthenticated direct writes, fault-endpoint isolation, the UI's server routes, and a check that browser source carries no credentials.
- Latest whole-product run against ARC Control `main` `887dd2f` (27 Oct 2026, `docs/PRODUCT_HARNESS.md`): 17/17 integration; Phase 2 35 pass, 0 fail, 3 unsupported, 2 not implemented; stress 9/9; product surface 22 pass; Northwind Bank 13 pass; 76/76 ARC routes covered or stated as gaps. The three earlier findings are fixed on `main` and independently retested.
- **Clone `arc-control` at `main`.** Its GitHub default branch is an old branch (`162d00d`); results measured there are out of date.
- **Not verified here:** actual end-to-end integration against a built checkout of ARC Control; ARC packages are not in this archive. The integration adapter is based on source inspected from the GitHub repository and needs a real integration run.
- Never interpret a UI badge as proof without the observed effects and evidence. The scenarios assert these whenever ARC has made a decision.

## Setup

Node.js **22+** and a checkout of ARC Control 2.0 are required. Place both repositories as siblings:

```text
work/
  arc-control/               # existing aking-beep/arc-control repo, current branch
  arc-control-sandbox/       # this project
```

```bash
# From your preferred directory
mkdir -p arc-test && cd arc-test
git clone https://github.com/aking-beep/arc-control.git
cd arc-control
npm install
npm run build
cd ..
# Unzip this archive into arc-control-sandbox/ or clone your own new sandbox repo
cd arc-control-sandbox
npm test
npm start
```

The project has **zero runtime npm dependencies**; it imports the built ARC Control modules from the sibling checkout. Override path if needed:

```bash
ARC_REPO_PATH=/absolute/path/to/arc-control npm start
```

When started successfully:

- `http://127.0.0.1:8890` — Meridian Validation Lab (the React UI in `ui/`, once built with `npm run ui:build`; until then the original page). The original single-file page stays at `/classic`.
- `http://127.0.0.1:8787` — real ARC Control API, started by sandbox bootstrap
- `http://127.0.0.1:8788` — real ARC Control console, started by sandbox bootstrap

Run the full scenario suite:

```bash
npm run smoke
```

The scenario runner checks **actual returned decisions, evidence presence when applicable, and actual backend effects**. Failed assertions show as failed scenarios instead of being replaced by a demo success state.

## How this integration works

```text
Browser (Meridian portal)
       |
       v
Meridian scenario runner (server-side agent keys)
       |
       v
ARC Control API /v1/actions (real gateway + real policy engine)
       |
       +-- DENY -----------------> evidence, zero Meridian effect
       +-- REQUIRE_APPROVAL -----> evidence, zero effect until operator approval
       +-- ALLOW / approved -----> generic-http connector
                                           |
                                           v
                                  x-meridian-connector-token
                                           |
                                           v
                                   Meridian /internal/*
                                           |
                                           v
                                    business mutation log
```

No agent API keys are sent to the browser. The ARC connector keeps the shared internal execution token server-side. The internal endpoints reject direct calls without it. **This is an application-level restriction, not yet proof of network-level isolation**, and ARC-AI-009 should not be reported as passing on this basis. All listening interfaces are loopback-only.

The stock `npm run api` in `arc-control` does not register the GenericHttpConnector. The custom `src/start.mjs` bootstrap creates ARC Control using its exported `createControlApi()`, installs the shipped connector with an allowlist of `127.0.0.1`, registers the seeded agents/tools/policies, then launches the actual ARC console. No source mutation is needed in `arc-control`.

## Included capabilities

Six agents: finance, support, IT, sales, HR and security. Policies exercise different enforcement profiles: routine refund allowed; middle-tier refund held; over-ceiling refund denied; unauthorized departmental access denied; IT protected-branch deployment denied; CRM export, HR salary read and security quarantine held for humans.

17 runnable scenarios include positive and negative tests: allowed refund, held refund, approval/execute, denied refund, wrong agent, unknown tool, malformed amount, suspension, tool disable, idempotency, support ticket update, protected deployment, development deployment, CRM export review, operator endpoint denial, direct backend bypass denial, and approval replay refusal.

The live load driver compares expected and actual execution counts and calculates throughput, p50, p95 and p99 request latency. It is **not** a production-grade performance benchmark; the in-memory store and single-node local loopback isolate results to this test environment.

ARC Assurance is invoked through the shipped `POST /v1/assurance/runs` and `GET /v1/assurance/summary` endpoints. `not_assessable`, `not_applicable` and `attested` must remain distinct from `pass`.

## Commands

```bash
npm test             # unit tests: Meridian backend, connector boundary, UI server routes
npm start            # local integrated three-server environment
npm run smoke        # live 17-scenario suite; requires running environment
npm run validate     # same 17 scenarios, writes reports/latest.json
npm run phase2       # phase 2 security, stress, and evidence report; requires npm start

npm run ui:install   # install the Validation Lab UI dependencies (ui/ only)
npm run ui:typecheck # tsc --noEmit over ui/src
npm run ui:build     # type check + production build into ui/dist, served by npm start on :8890
npm run ui:dev       # Vite dev server on http://127.0.0.1:5173, proxying /api to :8890
npm run product      # whole product: 17, Phase 2, stress, product surface, Northwind Bank, coverage
npm run coverage     # ARC route and capability map from ARC source (--strict fails on unmapped routes)
npm run showcase     # read-only static page from the last product run
```

`npm run phase2` and `npm run product` exit non-zero while any implemented check fails; that exit code is the result, not a broken runner. On ARC `main` `887dd2f` both exit 0. See [`docs/PRODUCT_HARNESS.md`](docs/PRODUCT_HARNESS.md) for the suites, industry packs, CI and hosting.

## Meridian Validation Lab UI

`ui/` is the Magic Patterns redesign, integrated as a separate package so the backend keeps zero runtime dependencies. It talks only to same-origin `/api/*` on the Meridian server; it never calls ARC directly and never holds the operator token, agent keys or the connector token. Every figure on screen carries its source: LIVE (this server), RECORDED (`reports/*.json`), BASELINE (`docs/PHASE_2_READINESS.md`), REPO (source code) or ILLUSTRATIVE. Unsupported and not-implemented checks are never counted as passes. Findings are resolved only with a recorded fix and an independent retest, stay listed, and show as regressions if their check fails again; any failing Phase 2 check without a finding is listed too. **Suites & Industry Packs** runs the product-surface suite and the Northwind Bank pack, and **Product Coverage** maps every ARC route and capability to the check that exercises it. Details, the endpoint map and known gaps: [`docs/VALIDATION_LAB.md`](docs/VALIDATION_LAB.md).

Phase 2 is a separate catalogue. It does not replace the 17 integration scenarios. `reports/phase2-latest.json` records passes, failures, unsupported product gaps, and not-implemented checks. A green sandbox run is not an enterprise certification.

## What the starter does NOT include yet

- All 12 target agents (currently six)
- Real LLM-driven agents; current scenarios are deterministic
- Full malicious MCP server and manifest drift experiments (planned in docs)
- Exported, offline-verified evidence bundles or an independently stored audit head (planned)
- Working Docker/Kubernetes network segmentation, real IAM/SSO/RBAC or HA load tests
- Multi-organization isolation and distributed load generation
- External scanner-based security audit or penetration testing
- Persisted Meridian database: intentionally resettable in-memory fixtures for first integration stage

See `docs/MASTER_BUILD_PLAN.md`, `docs/MAGIC_PATTERNS_PROMPT.md`, `docs/CLAUDE_CODE_PROMPT.md` and `docs/VALIDATION_LAB.md` for the expansion plan, tooling workflow and UI integration.

## Safety

All company data is fictional. All operations are fake side effects in the local backend. Do not use production secrets, real customers, personal data, or real cloud access. The server has NO authentication for its browser test-operator endpoints: it is deliberately constrained to `127.0.0.1` and **must never be exposed directly to the internet**. Before shared hosting, add real operator authentication, CSRF defenses, network segmentation, protected management endpoints, encryption, and storage isolation.

## Same-day launch additions

For a step-by-step local run and UI handoff, start with [`docs/DAY_1_RUNBOOK.md`](docs/DAY_1_RUNBOOK.md).

```bash
npm run preflight  # verify Node 22+, ARC compiled modules and free local ports
npm start          # launch the integrated stack (keep this terminal open)
npm run validate   # second terminal: 17-scenario HTTP suite, writes reports/latest.json
```

Source prompts: `docs/CLAUDE_DAY1_PROMPT.md` and `docs/MAGIC_PATTERNS_DAY1_PROMPT.md`.
Do not commit `reports/` or share any source containing operator or agent credentials.
