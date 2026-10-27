# Claude Code prompt — build and verify Meridian Commerce Sandbox

You have two sibling codebases:

- `aking-beep/arc-control` — canonical ARC Control 2.0 implementation
- `arc-control-sandbox` — Meridian Commerce synthetic enterprise starter (the provided archive)

**Objective:** turn the starter into a fully functioning, independently observable, adversarial enterprise validation environment, then verify it against the REAL ARC Control gateway. Do not replace ARC decision logic with mocks.

### First: inspect and run

1. Inspect both repositories and read the ARC README, release boundary, actual APIs, schema contracts, gateway, connector implementations, approval and assurance routes, tests, and security limitations.
2. In the ARC checkout run `npm install`, `npm run build`, `npm run verify` and record the results.
3. In the sandbox run `npm test`, `npm start`, `npm run smoke` and record per-scenario actual outcomes. Do not claim a run happened unless it happened.
4. Repair only genuine compatibility and runtime issues. Do not silently relax expected safety behavior or downgrade a failing test.
5. Confirm the GenericHttpConnector is registered at sandbox startup and calls Meridian protected backend endpoints ONLY after ARC approval. Assert denial produces zero backend effects.
6. Confirm ARC Console and Assurance show actual seeded agents, tools, policy decisions and evidence.

### Second: architecture

- Keep Meridian independent from ARC; use actual exported ARC package entrypoints in the custom local bootstrap.
- Preserve a clear outbound connector contract; company internal endpoints require a backend-held secret and localhost-only connectivity in the P0 sandbox.
- Prevent browser exposure of ARC operator token, agent keys or connector credentials. Replace shared browser admin endpoints with authenticated session architecture BEFORE a hosted build.
- Replace the Meridian in-memory state with a resettable durable database when the 17 integration scenarios pass. Ensure independent mutation log and ARC evidence store.
- Add instrumentation (OpenTelemetry when useful) only where verified and supported, not for the sake of a technology checklist.

### Third: coverage

- Complete 40 scenarios documented in `docs/MASTER_BUILD_PLAN.md` as actual executable tests where features exist. Mark scenarios requiring unshipped ARC capabilities as `BLOCKED_BY_PRODUCT_GAP`, not passes.
- Add 12 agents across six departments, with a clear agent registry, owners, permitted tools, lifecycles and identity credentials.
- Implement actual malicious MCP test server, poisoned tool description, manifest pinning, drift detection, host-allowlist bypass attempts and refusal assertions.
- Introduce chaos cases (timeouts, connector failures, approval races, shutdown, replay) with exact expected semantics.
- Include 100/500/1000-action load runs, error statistics, backend effect reconciliation and post-run assurance assessments.
- Export machine-readable signed-or-digest-sealed test reports using available ARC primitives; test independent verification rather than inventing a new evidence format.

### Fourth: user experience

- Integrate the Magic Patterns UI as a pure UI layer. Preserve scenario server and actual business state.
- Implement accessible responsive company pages, employee portal, financial, support, IT, CRM, HR, security, scenario lab, stress lab, and ARC Assurance reporting.
- The UI must distinguish NOT RUN, RUNNING, PASS, FAIL, NOT ASSESSABLE, BLOCKED/UNSHIPPED and CONNECTOR ERROR.
- No fake requests, no fallback to canned successful JSON, no hard-coded counters, no status decoration that claims more than the code proves.

### Fifth: safe release

- Default all servers to loopback; production/public deployment requires auth, private networking, strong management API boundaries, CSRF defenses and secrets management.
- Document ARC 2.0 gaps: operator identities are claimed from headers behind a shared token; no SSO/RBAC, HA/Postgres, external audit anchoring job or independent penetration testing as of current release documentation. Do not present these as shipped.
- ARC-AI-006 must remain not_assessable unless an external trusted anchor exists; ARC-AI-009 requires independently verified deployment controls and a dated attestation.
- Never connect to real payments, real employee/customer records, or actual destructive infrastructure.

### Definition of done

Deliver one PR to the sandbox (and separate issue/PR proposals for any actual ARC Control product gaps) with test command output, reproducible fixtures, deployment instructions, code review, screenshots from the **real running UI**, results.json, README and known limitations. Distinguish implemented, executed, verified, pending and blocked features. Stop and report any unsupported APIs or failed security invariants rather than claiming completion.
