# Meridian Commerce Group — ARC Control Synthetic Enterprise

A **working starter integration harness** for `aking-beep/arc-control` 2.0, with the **Meridian Validation Lab** front end in [`ui/`](ui/). It is not an enterprise production system and not an ARC certification.

Meridian is a fictional company with six operational departments, a real in-process business state, six registered agent identities, six protected tool endpoints, six ARC policy documents, a custom ARC Control API bootstrap using its shipped **GenericHttpConnector**, ARC's native operator console, and **17 executable authorization scenarios**. A bounded concurrent load runner sends **100–1,000 real requests** through the ARC API and compares the outcomes with Meridian's own mutation log.

## Current verification level

- Verified by running it: `npm test` (6 tests), `npm run preflight`, the original
  17 scenarios (**17/17**), and the Phase 2 catalogue against a built checkout of
  ARC Control. See [`docs/PHASE_2_READINESS.md`](docs/PHASE_2_READINESS.md) for
  the measured result and the revisions it was measured against.
- `npm run phase2` **exits non-zero**: three implemented checks fail. That exit
  code is the result, not a broken runner. Do not weaken the assertions to make
  it green — the failures close when ARC Control is fixed and retested.
- **Not verified here:** anything beyond this local loopback process. No external
  certification, no penetration test, no production capacity claim.
- Never interpret a UI badge as proof without the observed effects and evidence.
  The scenarios assert these whenever ARC has made a decision. The UI tags every
  figure with where it came from — LIVE, RECORDED or REPOSITORY — and never
  shows an unrun check as passing.

## Repository layout

```text
arc-control-sandbox/
  package.json         backend manifest — zero runtime dependencies
  src/*.mjs            backend: start, company, scenarios, phase2, report, smoke, preflight
  tests/*.test.mjs     node:test unit tests
  public/              the original static showcase, served at /
  reports/             generated, git-ignored
  docs/                runbooks, build plan, Phase 2 readiness, porting notes
  ui/                  Meridian Validation Lab (React 18 + TypeScript + Vite + Tailwind 4)
    package.json       UI dependencies, separate from the backend
    src/               App, api/ providers, data/, lib/, components/, screens/
```

The backend keeps **zero runtime npm dependencies**. The UI's React/Vite
dependencies live only in `ui/`, so `npm install` at the root installs nothing
and the harness still runs on a machine that never builds the front end.

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

- `http://127.0.0.1:8890` — Meridian company command center
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

Backend — no install needed, zero runtime dependencies:

```bash
npm test            # unit tests: company boundary, fault endpoints, stress-plan math
npm run preflight   # Node 22+, ARC compiled modules, free local ports
npm start           # the integrated three-server stack (keep this terminal open)
npm run smoke       # live 17-scenario suite, prints pass/fail
npm run validate    # the 17 -> reports/latest.json           (exit 0 when 17/17)
npm run phase2      # Phase 2 + 9 stress runs + the 17
                    #   -> reports/phase2-latest.json         (exit 1: see below)
```

Validation Lab UI — in a second terminal, with the stack running:

```bash
npm run ui:install    # once
npm run ui:dev        # dev server on http://127.0.0.1:5173, proxies /api -> :8890
npm run ui:typecheck  # tsc --noEmit
npm run ui:build      # typecheck + production build into ui/dist
```

After `npm run ui:build`, the stack also serves the built UI at
**http://127.0.0.1:8890/ui/** — same origin as `/api/*`, so no CORS and no
second port. The original static showcase stays at `/`.

`MERIDIAN_BASE` overrides the proxy target for `ui:dev`; `ARC_REPO_PATH`
overrides the ARC Control checkout location.

### About `npm run phase2`'s exit code

It exits **1** because three implemented Phase 2 checks fail against the ARC
Control revision recorded in the report: concurrent idempotency, policy
revalidation before release, and retirement reversed through the activate route.
This is the correct current result. The runner is working; ARC Control has three
open defects. Treat a green `phase2` as suspicious until
`docs/PHASE_2_READINESS.md` says those defects are fixed and retested.

## How the UI reads its data

The browser talks only to Meridian on `:8890`. Agent API keys, the ARC operator
token and the connector execution token stay server-side; none of them is in the
browser bundle.

| Screen | Reads |
| --- | --- |
| Command Center | `/api/health`, `/api/scenarios`, `/api/phase2`, `/api/reports/latest`, `/api/state` |
| Scenario Lab | `/api/scenarios` + `/api/phase2` catalogues; runs via `POST /api/scenarios/:id` and `POST /api/phase2/:id` |
| Security Findings | live `fail` records from `/api/phase2`, joined to the narrative in `ui/src/data/findingDocs.ts` |
| Live Action Inspector | `/api/scenarios` run records — decision, evidence id, correlation id and the Meridian mutation count |
| Stress Lab | `POST /api/load` (count/concurrency/seed) and `POST /api/stress` (preset × seeds) |
| ARC Assurance | `POST /api/assurance` — five statuses kept separate, never summed |
| Validation Reports | `/api/reports`, `/api/reports/latest`, `/api/reports/phase2` (redacted server-side) |
| Environment Health | reachability of every route above, plus the revisions recorded in the Phase 2 report |

Capabilities with no sandbox route — ARC's own agent, tool, policy and approval
inventory, and evidence bodies — are listed as **not implemented** on
*System → Integrations*. Those screens read registration facts from
`src/start.mjs` and label them REPOSITORY rather than substituting a fixture.

## What the starter does NOT include yet

- Read-only proxy routes for ARC's own registry (`/api/arc/agents`, `/api/arc/tools`,
  `/api/arc/policies`, `/api/arc/approvals`, `/api/arc/evidence/:id`), so agent,
  tool and policy inventory in the UI is read from `src/start.mjs`, not from ARC
- Stress results persisted across a restart (`/api/load/history`)
- All 12 target agents (currently six)
- Real LLM-driven agents; current scenarios are deterministic
- Full malicious MCP server and manifest drift experiments (planned in docs)
- Exported, offline-verified evidence bundles or an independently stored audit head (planned)
- Working Docker/Kubernetes network segmentation, real IAM/SSO/RBAC or HA load tests
- Multi-organization isolation and distributed load generation
- External scanner-based security audit or penetration testing
- Persisted Meridian database: intentionally resettable in-memory fixtures for first integration stage

See `docs/MASTER_BUILD_PLAN.md`, `docs/MAGIC_PATTERNS_PROMPT.md`, and `docs/CLAUDE_CODE_PROMPT.md` for the complete expansion plan and tooling workflow.

## Safety

All company data is fictional. All operations are fake side effects in the local backend. Do not use production secrets, real customers, personal data, or real cloud access. The server has NO authentication for its browser test-operator endpoints: it is deliberately constrained to `127.0.0.1` and **must never be exposed directly to the internet**. Before shared hosting, add real operator authentication, CSRF defenses, network segmentation, protected management endpoints, encryption, and storage isolation.

## Same-day launch

For a step-by-step local run and UI handoff, start with [`docs/DAY_1_RUNBOOK.md`](docs/DAY_1_RUNBOOK.md).

```bash
npm run preflight                      # terminal 1
npm start                              # terminal 1, keep open
npm run validate && npm run phase2     # terminal 2 (phase2 exits 1 by design)
npm run ui:install && npm run ui:dev   # terminal 3 -> http://127.0.0.1:5173
```

Notes on the front end are in [`docs/PORTING.md`](docs/PORTING.md).
Source prompts: `docs/CLAUDE_DAY1_PROMPT.md` and `docs/MAGIC_PATTERNS_DAY1_PROMPT.md`.
Do not commit `reports/` or share any source containing operator or agent credentials.
