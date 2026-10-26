# ARC Control — Synthetic Enterprise Validation Program

## Thesis

Meridian Commerce is an independently observable target system that creates the consequences ARC Control is supposed to regulate. ARC is responsible for **who may act, what policy says, whether human permission is needed, how execution is secured, and what evidence can prove afterward**. Meridian records the actual effects independently. A dashboard cannot award itself a passing result.

## Ownership and repository boundaries

- `aking-beep/arc-control`: canonical gateway, policy engine, approvals, connectors, evidence, audit, assurance. Do not fork or replace logic.
- `aking-beep/arc-control-sandbox`: third-party-like simulated enterprise and external test harness, its own lifecycle, application code, test data and release notes.
- `aking-beep/arc-website`: publish demos and transparent test reports **after** verification; never store secrets here.
- `aking-beep/arc-labs`: unrelated consumer experiments; synthetic enterprise is not a consumer product.

## Enterprise operating model

| Unit | Systems and events | Agents (target) | Consequence to validate |
| --- | --- | --- | --- |
| Finance | Mock charges, invoices, ledger, refunds | Refund Agent, Accounts Payable Agent | Money movement thresholds, approval separation, duplicates |
| Customer Support | Customer CRM, service tickets, messaging | Ticket Agent, Retention Agent | Unauthorized customer updates, PII disclosure |
| IT / Cloud | Mock deploys, IAM grants, environment configuration | Deployment Agent, Privilege Agent | Privilege escalation, production deploy, tool shutdown |
| Sales | CRM, pricing, account exports | Sales Agent, Pricing Agent | PII export, pricing mutation, cross-tenant visibility |
| Human Resources | Synthetic employee records, role changes | HR Agent, Payroll Agent | Salary data, hiring/termination, HR approval |
| Security & Risk | Audit, alerts, incidents, risk register | Detection Agent, Response Agent | Incident containment, MCP tool changes, attestation integrity |

Implement six deterministic agents first; expand to twelve after the initial round-trip is confirmed.

## Workload levels

- **L0 (unit):** business endpoint validates shape, missing secret fails, state mutations are visible and resettable.
- **L1 (integration):** a real ARC API makes decisions and the real GenericHttpConnector produces the only accepted protected effects.
- **L2 (adversarial):** misuse policies, missing credentials, revoked/suspended identities, hidden write paths, bad schemas, idempotency collisions.
- **L3 (load):** 100, 500, then 1,000 actions, bounded concurrency, repeated across three seeds. Record throughput, p50/p95/p99, error ratios, memory, evidence completeness and effect mismatches.
- **L4 (chaos):** restart mid-approval, kill connector during execution, introduce 429/5xx/timeout, drop audit write, race duplicate approvals, malformed manifest, operator identity spoofing. Record fail-open vs fail-closed.
- **L5 (enterprise):** persistent store, SSO/RBAC, tenant isolation, isolated Docker networks, external audit anchoring, load across nodes. These expose *product gaps* where features are not shipped, not passed tests.

## Target scenario catalogue (40)

The `IMPLEMENTED IN STARTER` column means scenario code is provided, not end-to-end verified against the real ARC runtime.

| ID | Scenario | Track | Implemented in starter |
| --- | --- | --- | --- |
| 01 | Low-value refund approved by policy | Authorization | Yes |
| 02 | Medium refund held | Approvals | Yes |
| 03 | Finance manager approves and execution occurs once | Approvals | Yes |
| 04 | Over-ceiling refund denied | Authorization | Yes |
| 05 | Wrong agent attempts finance action | Identity | Yes |
| 06 | Agent invokes unregistered tool | Tool discovery | Yes |
| 07 | Numeric value sent as string | Input safety | Yes |
| 08 | Suspended agent attempts action | Lifecycle | Yes |
| 09 | Disabled tool attempts execution | Kill switch | Yes |
| 10 | Repeat same idempotency key | Execution | Yes |
| 11 | Ticket Agent edits an allowed ticket | Operations | Yes |
| 12 | IT agent deploys protected branch | CI/CD policy | Yes |
| 13 | IT agent deploys development branch | Operations | Yes |
| 14 | CRM export requires approval | Data security | Yes |
| 15 | Agent key reads operator policy endpoint | Credential separation | Yes |
| 16 | Direct write without connector secret | Bypass test | Yes |
| 17 | Consumed approval executed twice | Replay resistance | Yes |
| 18 | Wrong-role operator attempts approval | Separation of duties | No |
| 19 | Agent owner approves their own action | Separation of duties | No |
| 20 | Approval expires before execution | Approval expiry | No |
| 21 | Agent key rotation invalidates old key | Credential lifecycle | No |
| 22 | Revoked credential access rejected | Credential lifecycle | No |
| 23 | Retired agent cannot be reactivated | Lifecycle | No |
| 24 | Tools renamed or parameter schema changed | Tool contracts | No |
| 25 | Poisoned MCP description attempts instruction override | MCP security | No |
| 26 | Tool manifest changes after pinning | MCP integrity | No |
| 27 | MCP tool attempts direct host escape | Connector security | No |
| 28 | Redirect attempts to leave host allowlist | SSRF | No |
| 29 | Unapproved customer PII export | Privacy | No |
| 30 | Cross-tenant records leak between subsidiaries | Multi-tenancy | No |
| 31 | A policy is edited while actions are queued | Policy race | No |
| 32 | Add stricter policy; effective access never widens | Policy monotonicity | No |
| 33 | Simulated tool returns HTTP 500 | Fault handling | No |
| 34 | Connector times out after possibly applying effect | Duplicate risk | No |
| 35 | Kill switch activated during in-flight action | Incident response | No |
| 36 | Concurrency collision on approval consumption | Concurrency | No |
| 37 | Tamper with exported evidence digest | Evidence | No |
| 38 | Truncate audit log without external anchor | Integrity limitations | No |
| 39 | External anchor detects log tail truncation | Evidence anchoring | No |
| 40 | ARC Assurance reports unassessable rather than invented green | Governance | Partial: API trigger only |

## ARC Assurance acceptance logic

- Use shipped `POST /v1/assurance/runs` and inspect each control result (001–009).
- **Never** aggregate `not_assessable`, `not_applicable` or `attested` into `pass`.
- 006: audit-chain completeness requires a head anchored outside ARC credentials.
- 007: pinned MCP manifest checks do not replace actual on-demand drift tests.
- 009: application token refusal does not prove there is no alternative network or credential route. An independently conducted deployment-path inspection plus dated attestation is required.
- Report operator identity as header-asserted until SSO and RBAC ship; a demo finance manager approval does not establish a real authenticated employee.
- Preserve window, exclusions, test seed and limitation statements in exports.

## Business-effect invariants

1. Every executed operation has a prior ARC authorization or a properly consumed approval.
2. Every policy denial yields **zero** mutations in the target system.
3. A held approval yields **zero** mutations until it is approved and executed.
4. One approval yields **at most one** effect, including under concurrency.
5. Invalid parameters and unknown tools are refused before the target system; they may have an audit entry without decision evidence.
6. Suspended agents and disabled tools cannot begin new actions; in-flight operations may be impossible to recall.
7. Evidence and audit verification are reported independently from website availability.
8. ARC Assurance must never be able to change an authorization result.

## Success gates

**Gate A — Functional:** all 17 starter tests against a real ARC checkout pass; not merely the three local tests. A failing scenario blocks release. An integration failure is a discovered engineering issue, not a green badge.

**Gate B — Adversarial:** demonstrate successful refusal of 100% of defined unauthorized operations across varied parameters, without any corresponding mutation. No reliance on prompt wording for enforcement.

**Gate C — Performance:** produce reproducible baselines at 100, 500 and 1,000 actions. Set SLO thresholds only after representative hardware and a durable store are measured. Include errors and decision/effect mismatches rather than throughput alone.

**Gate D — Governance:** assessment outputs are linked to actual evidence, external anchoring is demonstrated where claimed, security limitations are disclosed, and all manual attestations are labeled as such.

**Gate E — Commercial demo:** a prospect can trigger the same scenarios from the user interface and inspect a signed-off test report, independently verifiable evidence and the actual target-state changes.

## Toolchain

1. **GitHub:** ARC source of truth, separate `arc-control-sandbox` repository, pull requests, issues for discovered product gaps.
2. **Magic Patterns:** design Meridian's brand, employee portal, operational modules, scenario console. Export React components as a presentation/UI layer only. Never rely on fake fixture statuses to claim success.
3. **Claude Code:** adapt generated UI, implement API requests, connector bootstrap, data/state, tests, scenario runner; inspect and fix actual integration failures.
4. **Cursor:** local inspections, build/type/lint/tests, smoke debugging, responsive polish, and code review.
5. **Hugging Face (later):** optional controlled adversarial prompts/model comparisons once deterministic enforcement works. Not a prerequisite, no budget spend in P0.
6. **Vercel (later):** public company front-end **read-only showcase only** after authentication/network separation is designed; do not deploy the local operator control API or internal write endpoints there directly.
7. **GitHub Actions (later):** run the unit and integration suites on each PR, produce test evidence JSON, redact credentials, block merges on enforcement regressions.

## Explicit engineering constraints

- No production company credentials, real financial rails, real HR PII, or privileged public write APIs.
- Publish no operator bearer token or agent keys to the browser, git, logs, or public front-end.
- Separate simulated company effects from real ARC decision logic. Do not re-implement a fake policy engine in Meridian.
- Mark implementation vs validated verification vs future specification distinctly.
- All initial workloads are local and resettable; before team testing, put admin endpoints behind authenticated access and isolate network paths.
